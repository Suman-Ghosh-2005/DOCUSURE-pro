import { z } from 'zod';

export const officerDecisionSchema = z
  .object({
    decision: z.enum(['APPROVE', 'REJECT', 'REQUEST_CORRECTION']),
    notes: z.string().min(3, 'Officer decision notes must be at least 3 characters long'),
    rejection_reasons: z.array(z.string()).optional(),
  })
  .refine(
    (data) => {
      if (data.decision === 'REJECT') {
        return data.rejection_reasons && data.rejection_reasons.length > 0;
      }
      return true;
    },
    {
      message: 'At least one rejection reason is required when rejecting an application',
      path: ['rejection_reasons'],
    }
  );

export type OfficerDecisionInput = z.infer<typeof officerDecisionSchema>;
