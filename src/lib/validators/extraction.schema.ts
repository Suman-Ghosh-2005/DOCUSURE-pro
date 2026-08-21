import { z } from 'zod';

export const extractedFieldItemSchema = z.object({
  field_name: z.string(),
  raw_value: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  source_text: z.string().nullable(),
});

export const documentExtractionSchema = z.object({
  document_type: z.string(),
  fields: z.array(extractedFieldItemSchema),
});

export const singleDocumentAISchema = z.object({
  document_type: z.string(),
  classification_confidence: z.number().min(0).max(1).default(0.95),
  classification_reasoning: z.string().optional().default('Document classified based on header and field structures'),
  fields: z.array(extractedFieldItemSchema),
});

export const documentExtractionItemSchema = z.object({
  slot_type: z.string(),
  document_type: z.string(),
  classification_confidence: z.number().min(0).max(1).default(0.95),
  classification_reasoning: z.string().optional().default('Document classified based on content'),
  fields: z.array(extractedFieldItemSchema),
});

export const multiDocumentAISchema = z.object({
  documents: z.array(documentExtractionItemSchema),
});

export type ExtractedFieldItem = z.infer<typeof extractedFieldItemSchema>;
export type DocumentExtractionOutput = z.infer<typeof documentExtractionSchema>;
export type SingleDocumentAIOutput = z.infer<typeof singleDocumentAISchema>;
export type DocumentExtractionItem = z.infer<typeof documentExtractionItemSchema>;
export type MultiDocumentAIOutput = z.infer<typeof multiDocumentAISchema>;
