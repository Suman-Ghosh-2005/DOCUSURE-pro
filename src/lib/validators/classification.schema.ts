import { z } from 'zod';

export const documentClassificationSchema = z.object({
  document_type: z.enum([
    'ID_PROOF',
    'INCOME_CERTIFICATE',
    'MARKSHEET',
    'DOMICILE_CERTIFICATE',
    'BANK_PASSBOOK',
    'CASTE_CERTIFICATE',
    'DISABILITY_CERTIFICATE',
    'BIRTH_CERTIFICATE',
    'UNKNOWN',
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  key_indicators: z.array(z.string()).optional(),
});

export type DocumentClassificationOutput = z.infer<typeof documentClassificationSchema>;
