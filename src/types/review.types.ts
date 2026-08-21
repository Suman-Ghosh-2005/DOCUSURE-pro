export type OfficerDecision = 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION';

export interface OfficerReviewPayload {
  application_id: string;
  decision: OfficerDecision;
  notes: string;
  rejection_reasons?: string[];
  correction_documents?: string[];
}

export interface OfficerReviewRecord {
  id: string;
  application_id: string;
  decision: OfficerDecision;
  notes: string;
  rejection_reasons?: string[];
  created_at: string;
}

export interface AISummaryOutput {
  applicant_profile: string;
  document_completeness: string;
  key_issues: string[];
  points_for_officer_attention: string[];
  overall_assessment: string;
}
