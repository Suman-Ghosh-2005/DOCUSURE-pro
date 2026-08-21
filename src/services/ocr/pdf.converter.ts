// Use pdf-parse core extractor directly to avoid top-level test file loading during Next.js build evaluation
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

export interface PDFTextExtractionResult {
  text: string;
  pageCount: number;
  wordCount: number;
  success: boolean;
  error?: string;
}

/**
 * Server-Side PDF Text Extractor Utility
 * Uses pdf-parse to extract machine-readable text from all pages in order.
 * Works natively in Node.js server routes (Next.js App Router) without web workers or canvas dependencies.
 */
export async function extractTextFromPDFBuffer(pdfBuffer: Buffer): Promise<PDFTextExtractionResult> {
  try {
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      return {
        text: '',
        pageCount: 0,
        wordCount: 0,
        success: false,
        error: 'Invalid or empty PDF buffer supplied',
      };
    }

    // Verify PDF header magic bytes "%PDF-"
    const headerStr = pdfBuffer.slice(0, 5).toString('ascii');
    if (!headerStr.startsWith('%PDF-')) {
      return {
        text: '',
        pageCount: 0,
        wordCount: 0,
        success: false,
        error: 'Buffer does not contain valid PDF magic header (%PDF-)',
      };
    }

    // pdf-parse extracts all page text sequentially in page order
    const data = await pdfParse(pdfBuffer);
    const rawText = data.text ? data.text.trim() : '';
    const wordCount = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;
    const pageCount = data.numpages || 1;

    return {
      text: rawText,
      pageCount,
      wordCount,
      success: true,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'PDF text extraction failed';
    console.error('[PDF Extractor Error]:', errorMsg);
    return {
      text: '',
      pageCount: 0,
      wordCount: 0,
      success: false,
      error: errorMsg,
    };
  }
}
