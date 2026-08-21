import { z } from 'zod';

export const createApplicationSchema = z.object({
  applicant_name: z.string().min(2, 'Applicant name must be at least 2 characters'),
  dob: z.string().optional(),
  gender: z.string().optional(),
  scheme_id: z.string().uuid('Invalid Scheme ID format'),
});

export const loadScenarioSchema = z.object({
  scenario_id: z.enum([
    'SCENARIO_1_VALID',
    'SCENARIO_2_NAME_MISMATCH',
    'SCENARIO_3_INCOME_INELIGIBLE',
    'SCENARIO_4_MISSING_DOC',
    'SCENARIO_5_MULTIPLE_ISSUES',
  ]),
});

export const uploadDocumentSchema = z.object({
  application_id: z.string().uuid(),
  slot_type: z.enum(['ID_PROOF', 'INCOME_CERT', 'MARKSHEET', 'DOMICILE_CERT']),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type LoadScenarioInput = z.infer<typeof loadScenarioSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
