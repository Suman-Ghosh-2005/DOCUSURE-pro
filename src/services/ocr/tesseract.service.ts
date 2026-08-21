import { createWorker, PSM } from 'tesseract.js';
import { extractTextFromPDFBuffer } from './pdf.converter';

export interface OCRResult {
  raw_text: string;
  ocr_confidence: number; // 0.000 to 1.000
  word_count: number;
  page_count: number;
  success: boolean;
  error?: string;
}

interface TesseractWord {
  text?: string;
  confidence?: number;
}

interface TesseractRecognizeResultData {
  text?: string;
  confidence?: number;
  words?: TesseractWord[];
}

/**
 * Utility function to sanitize extracted OCR text for PostgreSQL compatibility.
 * Removes NUL bytes (\u0000 / \0) which are forbidden in PostgreSQL TEXT columns (Error 22P05).
 * Preserves all legitimate letters, numbers, punctuation, ₹, newlines, tabs, and regional characters.
 */
export function sanitizeOCRText(text: string): string {
  if (!text) return '';
  return text.replace(/\0/g, '').replace(/\u0000/g, '');
}

/**
 * Server-Side Document Extraction Engine (Phase 3 Repair)
 * Strictly branches between PDF parser (pdf-parse) and Image OCR (Tesseract.js).
 * CRITICAL RULE: Failed PDFs NEVER fall through to Tesseract.
 */
export async function extractTextFromDocumentBuffer(
  fileBuffer: Buffer,
  mimeType: string
): Promise<OCRResult> {
  const cleanMime = (mimeType || '').toLowerCase().trim();

  // BRANCH 1: PDF DOCUMENT PROCESSING ONLY
  if (cleanMime === 'application/pdf') {
    const pdfResult = await extractTextFromPDFBuffer(fileBuffer);
    if (pdfResult.success && pdfResult.text && pdfResult.text.length > 0) {
      const sanitizedText = sanitizeOCRText(pdfResult.text);
      return {
        raw_text: sanitizedText,
        ocr_confidence: 0.95, // 95.0% confidence for clean machine-readable PDF text
        word_count: pdfResult.wordCount,
        page_count: pdfResult.pageCount,
        success: true,
      };
    }

    // A failed PDF MUST NEVER fall through to Tesseract!
    return {
      raw_text: '',
      ocr_confidence: 0.0,
      word_count: 0,
      page_count: pdfResult.pageCount || 0,
      success: false,
      error: pdfResult.error || 'PDF text extraction produced no readable text',
    };
  }

  // BRANCH 2: IMAGE PROCESSING ONLY (PNG / JPEG via Tesseract.js)
  if (['image/png', 'image/jpeg', 'image/jpg'].includes(cleanMime)) {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer) || fileBuffer.length === 0) {
      return {
        raw_text: '',
        ocr_confidence: 0.0,
        word_count: 0,
        page_count: 1,
        success: false,
        error: 'Invalid or empty image buffer supplied',
      };
    }

    let worker;
    try {
      worker = await createWorker('eng');
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
      });

      const { data } = await worker.recognize(fileBuffer);
      const pageData = data as unknown as TesseractRecognizeResultData;
      const rawText = pageData.text ? sanitizeOCRText(pageData.text.trim()) : '';

      let totalWordConfidenceSum = 0;
      let totalWordCount = 0;

      if (pageData.words && Array.isArray(pageData.words) && pageData.words.length > 0) {
        for (const word of pageData.words) {
          if (word.text && word.text.trim().length > 0) {
            totalWordConfidenceSum += word.confidence ?? 0;
            totalWordCount += 1;
          }
        }
      } else if (typeof pageData.confidence === 'number' && rawText) {
        const approxWords = rawText.split(/\s+/).filter(Boolean).length;
        if (approxWords > 0) {
          totalWordConfidenceSum += pageData.confidence * approxWords;
          totalWordCount += approxWords;
        }
      }

      let ocrConfidence = 0.0;
      if (totalWordCount > 0) {
        const averageConfidence = totalWordConfidenceSum / totalWordCount;
        ocrConfidence = Math.min(1.0, Math.max(0.0, averageConfidence / 100));
        ocrConfidence = Math.round(ocrConfidence * 1000) / 1000;
      }

      return {
        raw_text: rawText,
        ocr_confidence: ocrConfidence,
        word_count: totalWordCount,
        page_count: 1,
        success: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Tesseract image OCR failed';
      console.error('[OCR Engine Error] Image extraction failed:', errorMsg);
      return {
        raw_text: '',
        ocr_confidence: 0.0,
        word_count: 0,
        page_count: 1,
        success: false,
        error: errorMsg,
      };
    } finally {
      if (worker) {
        await worker.terminate();
      }
    }
  }

  // BRANCH 3: UNSUPPORTED FORMAT
  return {
    raw_text: '',
    ocr_confidence: 0.0,
    word_count: 0,
    page_count: 0,
    success: false,
    error: `Unsupported format '${mimeType}'. Supported formats: PDF, PNG, JPEG`,
  };
}
