import { z } from 'zod';

export const mismatchExplanationSchema = z.object({
  applicant_explanation: z.string(),
  officer_explanation: z.string(),
});

export const applicationSummarySchema = z.object({
  applicant_profile: z.string(),
  document_completeness: z.string(),
  key_issues: z.array(z.string()),
  points_for_officer_attention: z.array(z.string()),
  overall_assessment: z.string(),
});

export type MismatchExplanationOutput = z.infer<typeof mismatchExplanationSchema>;
export type ApplicationSummaryOutput = z.infer<typeof applicationSummarySchema>;
