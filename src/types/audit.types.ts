export type AuditEventType =
  | 'APPLICATION_CREATED'
  | 'DOCUMENT_UPLOADED'
  | 'OCR_COMPLETED'
  | 'AI_EXTRACTION_COMPLETED'
  | 'VERIFICATION_COMPLETED'
  | 'ELIGIBILITY_EVALUATED'
  | 'RISK_EVALUATED'
  | 'OFFICER_DECISION';

export type AuditActorType = 'SYSTEM' | 'APPLICANT' | 'OFFICER';

export interface AuditEventRecord {
  id: string;
  application_id: string;
  processing_job_id?: string | null;
  event_type: AuditEventType;
  event_data: Record<string, unknown>;
  previous_hash: string | null;
  event_hash: string;
  created_at: string;
  actor_type: AuditActorType;
  actor_id?: string | null;
}

export interface AuditVerificationResult {
  valid: boolean;
  event_count: number;
  first_invalid_event_id: string | null;
  reason?: 'HASH_MISMATCH' | 'LINKAGE_BROKEN' | null;
}
