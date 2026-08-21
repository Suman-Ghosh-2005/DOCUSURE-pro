import { callGeminiStructured } from '@/lib/ai/gemini';
import {
  singleDocumentAISchema,
  SingleDocumentAIOutput,
  multiDocumentAISchema,
  MultiDocumentAIOutput,
} from '@/lib/validators/extraction.schema';
import { normalizeName, normalizeDate, normalizeIncome } from '@/services/verification/normalizer';

export interface ProcessedExtractedField {
  field_name: string;
  raw_value: string | null;
  normalized_value: string | number | null;
  confidence: number;
  source_text: string | null;
  evidence_verified: boolean;
}

export interface SingleDocumentAIProcessingResult {
  classified_type: string;
  classification_confidence: number;
  classification_reasoning: string;
  fields: ProcessedExtractedField[];
}

export interface ApplicationInputDocument {
  id: string;
  slot_type: string;
  ocr_text: string;
}

export interface ApplicationMultiDocAIResult {
  documents: Array<{
    document_id: string;
    slot_type: string;
    classified_type: string;
    classification_confidence: number;
    classification_reasoning: string;
    fields: ProcessedExtractedField[];
  }>;
}

/**
 * Validate that extracted source_text snippet exists in raw OCR text.
 * Exact substring match first, fallback to normalized evidence match.
 */
function validateSourceEvidence(rawOcrText: string, sourceText: string | null): boolean {
  if (!sourceText || !sourceText.trim()) return false;
  const cleanOcr = rawOcrText.toLowerCase();
  const cleanSource = sourceText.toLowerCase().trim();

  // 1. Exact Substring Match
  if (cleanOcr.includes(cleanSource)) return true;

  // 2. Normalized Substring Match (Strip punctuation & extra spaces)
  const normOcr = cleanOcr.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  const normSource = cleanSource.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');

  return normOcr.includes(normSource);
}

/**
 * Deterministic Normalizer per Field Name
 */
export function normalizeFieldValue(fieldName: string, rawValue: string | null): string | number | null {
  if (!rawValue) return null;

  if (['applicant_name', 'student_name', 'holder_name', 'resident_name'].includes(fieldName)) {
    return normalizeName(rawValue);
  }

  if (['dob', 'issue_date', 'valid_until'].includes(fieldName)) {
    return normalizeDate(rawValue);
  }

  if (['annual_income', 'marks_obtained', 'max_marks'].includes(fieldName)) {
    return normalizeIncome(rawValue);
  }

  if (fieldName === 'marks_percentage') {
    const floatVal = parseFloat(rawValue.replace(/[^0-9.]/g, ''));
    return isNaN(floatVal) ? null : floatVal;
  }

  if (fieldName === 'domicile_state') {
    const trimmed = rawValue.trim();
    if (trimmed.toUpperCase().includes('WEST BENGAL') || trimmed.toUpperCase().includes('WB')) {
      return 'West Bengal';
    }
    return trimmed;
  }

  return rawValue.trim();
}

/**
 * Combined Single-Request AI Processing per Document (Fallback)
 */
export async function processSingleDocumentAI(
  ocrText: string,
  slotTypeHint: string
): Promise<SingleDocumentAIProcessingResult> {
  const targetFieldNamesBySlot: Record<string, string[]> = {
    ID_PROOF: ['applicant_name', 'dob', 'gender', 'address', 'id_number'],
    INCOME_CERTIFICATE: ['applicant_name', 'annual_income', 'financial_year', 'valid_until'],
    INCOME_CERT: ['applicant_name', 'annual_income', 'financial_year', 'valid_until'],
    MARKSHEET: ['applicant_name', 'dob', 'roll_number', 'marks_obtained', 'max_marks', 'marks_percentage', 'exam_year'],
    DOMICILE_CERTIFICATE: ['applicant_name', 'dob', 'domicile_state', 'district', 'issue_date'],
    DOMICILE_CERT: ['applicant_name', 'dob', 'domicile_state', 'district', 'issue_date'],
  };

  const expectedFields = targetFieldNamesBySlot[slotTypeHint] || ['applicant_name', 'dob'];

  const systemInstruction = `
You are an expert government document processing assistant.
Your task is to classify the document and extract structured fields from raw OCR text in EXACTLY ONE JSON response.

CLASSIFICATION INSTRUCTION:
- Slot Type Hint: "${slotTypeHint}"
- Standard Document Types: 'ID_PROOF', 'INCOME_CERT', 'MARKSHEET', 'DOMICILE_CERT'.

FIELD EXTRACTION INSTRUCTION:
Extract ONLY the following target fields:
${expectedFields.map((f) => `- ${f}`).join('\n')}

STRICT RULES:
1. Return JSON matching schema:
{
  "document_type": string,
  "classification_confidence": number,
  "classification_reasoning": string,
  "fields": [
    {
      "field_name": string,
      "raw_value": string | null,
      "confidence": number,
      "source_text": string | null
    }
  ]
}
2. "source_text": MUST be the exact snippet from the raw OCR text that provided this value.
3. If a field is NOT present in the OCR text, set raw_value: null, confidence: 0.0, source_text: null.
4. NEVER invent or guess data.
5. "confidence": Model-estimated confidence between 0.0 and 1.0.
`;

  const prompt = `
SLOT TYPE HINT: ${slotTypeHint}

RAW OCR TEXT:
"""
${ocrText}
"""
`;

  const { parsed } = await callGeminiStructured<SingleDocumentAIOutput>({
    prompt,
    systemInstruction,
    temperature: 0.0,
  });

  if (!parsed) {
    throw new Error(`Gemini returned invalid or unparseable JSON for slot '${slotTypeHint}'`);
  }

  const validated = singleDocumentAISchema.parse(parsed);
  const processedFields: ProcessedExtractedField[] = [];

  for (const item of validated.fields) {
    const isEvidenceValid = item.raw_value ? validateSourceEvidence(ocrText, item.source_text) : false;

    let finalRawValue = item.raw_value;
    let finalConfidence = item.confidence;
    let finalNormalizedValue = normalizeFieldValue(item.field_name, item.raw_value);

    if (item.raw_value && !isEvidenceValid) {
      console.warn(`[Evidence Check Failed] Field '${item.field_name}': snippet "${item.source_text}" not found in OCR text.`);
      finalRawValue = null;
      finalNormalizedValue = null;
      finalConfidence = 0.0;
    }

    processedFields.push({
      field_name: item.field_name,
      raw_value: finalRawValue,
      normalized_value: finalNormalizedValue,
      confidence: finalConfidence,
      source_text: item.source_text,
      evidence_verified: isEvidenceValid,
    });
  }

  return {
    classified_type: validated.document_type || slotTypeHint,
    classification_confidence: validated.classification_confidence ?? 0.95,
    classification_reasoning: validated.classification_reasoning || 'Classified based on document content',
    fields: processedFields,
  };
}

/**
 * Multi-Document Single Gemini Call Architecture (Free-Tier Optimization)
 * Processes ALL documents of an application in EXACTLY ONE Gemini API Request.
 */
export async function processMultiDocumentApplicationAI(
  documents: ApplicationInputDocument[]
): Promise<ApplicationMultiDocAIResult> {
  const systemInstruction = `
You are an expert government scholarship document verification assistant.
Your task is to classify and extract structured fields for ALL submitted documents in an application in EXACTLY ONE JSON response.

DOCUMENT TARGET FIELDS PER SLOT TYPE:
- ID_PROOF: Extract ['applicant_name', 'dob', 'gender', 'address', 'id_number']
- INCOME_CERT / INCOME_CERTIFICATE: Extract ['applicant_name', 'annual_income', 'financial_year', 'valid_until']
- MARKSHEET: Extract ['applicant_name', 'dob', 'roll_number', 'marks_obtained', 'max_marks', 'marks_percentage', 'exam_year']
- DOMICILE_CERT / DOMICILE_CERTIFICATE: Extract ['applicant_name', 'dob', 'domicile_state', 'district', 'issue_date']

STRICT JSON OUTPUT FORMAT:
{
  "documents": [
    {
      "slot_type": "ID_PROOF",
      "document_type": "ID_PROOF",
      "classification_confidence": 0.98,
      "classification_reasoning": "Identity document header and applicant details present",
      "fields": [
        {
          "field_name": "applicant_name",
          "raw_value": "ANANYA GHOSH",
          "confidence": 0.98,
          "source_text": "Name of Applicant: ANANYA GHOSH"
        }
      ]
    }
  ]
}

STRICT RULES:
1. Provide an entry in "documents" for EVERY document listed in the prompt matching its slot_type.
2. "source_text": MUST be the exact snippet from that document's raw OCR text that provided the value.
3. If a field is NOT present in that document's OCR text, set raw_value: null, confidence: 0.0, source_text: null.
4. NEVER invent or guess data across documents.
`;

  const formattedDocs = documents.map((doc, idx) => `
=== DOCUMENT ${idx + 1} ===
SLOT TYPE: ${doc.slot_type}
DOCUMENT ID: ${doc.id}

RAW OCR TEXT:
"""
${doc.ocr_text}
"""
`).join('\n\n');

  const prompt = `
APPLICATION EVIDENCE SET (${documents.length} DOCUMENTS):

${formattedDocs}
`;

  // EXECUTE EXACTLY ONE GEMINI API CALL FOR THE ENTIRE APPLICATION
  const { parsed } = await callGeminiStructured<MultiDocumentAIOutput>({
    prompt,
    systemInstruction,
    temperature: 0.0,
  });

  if (!parsed) {
    throw new Error('Gemini returned invalid or unparseable multi-document JSON response');
  }

  const validated = multiDocumentAISchema.parse(parsed);
  const resultDocs: ApplicationMultiDocAIResult['documents'] = [];

  for (const inputDoc of documents) {
    const matchedAI = validated.documents.find(
      (d) => d.slot_type.toUpperCase() === inputDoc.slot_type.toUpperCase()
    ) || validated.documents[resultDocs.length];

    const fieldsList: ProcessedExtractedField[] = [];

    if (matchedAI && matchedAI.fields) {
      for (const item of matchedAI.fields) {
        const isEvidenceValid = item.raw_value ? validateSourceEvidence(inputDoc.ocr_text, item.source_text) : false;

        let finalRawValue = item.raw_value;
        let finalConfidence = item.confidence;
        let finalNormalizedValue = normalizeFieldValue(item.field_name, item.raw_value);

        if (item.raw_value && !isEvidenceValid) {
          console.warn(`[Evidence Check Failed] Slot '${inputDoc.slot_type}', Field '${item.field_name}': snippet "${item.source_text}" not found in OCR text.`);
          finalRawValue = null;
          finalNormalizedValue = null;
          finalConfidence = 0.0;
        }

        fieldsList.push({
          field_name: item.field_name,
          raw_value: finalRawValue,
          normalized_value: finalNormalizedValue,
          confidence: finalConfidence,
          source_text: item.source_text,
          evidence_verified: isEvidenceValid,
        });
      }
    }

    resultDocs.push({
      document_id: inputDoc.id,
      slot_type: inputDoc.slot_type,
      classified_type: matchedAI?.document_type || inputDoc.slot_type,
      classification_confidence: matchedAI?.classification_confidence ?? 0.95,
      classification_reasoning: matchedAI?.classification_reasoning || 'Classified based on document content',
      fields: fieldsList,
    });
  }

  return { documents: resultDocs };
}

/**
 * Legacy wrapper function
 */
export async function extractFieldsFromDocument(
  ocrText: string,
  documentType: string
): Promise<ProcessedExtractedField[]> {
  const result = await processSingleDocumentAI(ocrText, documentType);
  return result.fields;
}
