import { callGeminiStructured } from '@/lib/ai/gemini';
import { documentClassificationSchema, DocumentClassificationOutput } from '@/lib/validators/classification.schema';
import { DocumentSlotType } from '@/types/document.types';

export interface ClassificationResult {
  document_type: string;
  confidence: number;
  reasoning: string;
  is_slot_mismatch: boolean;
}

/**
 * AI Document Classification Service
 * Uses Gemini to determine the type of government document from OCR text.
 * Compares output against slot_type as a prior hint.
 */
export async function classifyDocumentText(
  ocrText: string,
  slotTypeHint: DocumentSlotType,
  originalFilename?: string
): Promise<ClassificationResult> {
  const systemInstruction = `
You are a government document classification assistant.
Classify the provided OCR text into one of the following exact types:
- ID_PROOF (Identity documents like Aadhaar, Voter ID, Photo ID)
- INCOME_CERTIFICATE (Income certificate issued by revenue department/BDO)
- MARKSHEET (Academic mark statements, grade cards, board results)
- DOMICILE_CERTIFICATE (Permanent resident/domicile certificate)
- UNKNOWN (Unrecognized or arbitrary text)

RULES:
1. Output valid JSON matching: {"document_type": string, "confidence": number, "reasoning": string}
2. "confidence" must be an estimated score between 0.0 and 1.0.
3. Base your decision solely on text indicators (headers, document titles, issuing authorities).
`;

  const prompt = `
Original Filename: ${originalFilename || 'document.pdf'}
Slot Prior Hint: ${slotTypeHint}

OCR TEXT EXTRACTED FROM DOCUMENT:
"""
${ocrText}
"""
`;

  try {
    const { parsed } = await callGeminiStructured<DocumentClassificationOutput>({
      prompt,
      systemInstruction,
      temperature: 0.1,
    });

    if (parsed) {
      const validated = documentClassificationSchema.parse(parsed);
      const isMismatch = validated.document_type !== slotTypeHint && validated.document_type !== 'UNKNOWN';

      return {
        document_type: validated.document_type,
        confidence: validated.confidence,
        reasoning: validated.reasoning + (isMismatch ? ` [Notice: Classified as ${validated.document_type} but uploaded to ${slotTypeHint} slot]` : ''),
        is_slot_mismatch: isMismatch,
      };
    }
  } catch (error) {
    console.warn('[Classification Service] Gemini classification failed, using slot hint fallback:', error);
  }

  // Fallback to slot hint if Gemini call fails or fails Zod validation
  return {
    document_type: slotTypeHint,
    confidence: 0.8,
    reasoning: `Fallback to slot hint (${slotTypeHint}) due to AI classification unavailable.`,
    is_slot_mismatch: false,
  };
}
