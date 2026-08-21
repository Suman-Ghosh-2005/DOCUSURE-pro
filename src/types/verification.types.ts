export type VerificationMatchStatus =
  | 'MATCH'
  | 'MINOR_MISMATCH'
  | 'MAJOR_MISMATCH'
  | 'CRITICAL_MISMATCH'
  | 'MISSING'
  | 'SINGLE_SOURCE';

export interface DocumentFieldValue {
  document_id?: string;
  document_type: string;
  raw_value: string | null;
  normalized_value: string | number | null;
}

export interface FieldVerificationResult {
  id?: string;
  application_id: string;
  field_name: string;
  status: VerificationMatchStatus;
  documents_compared?: string[];
  values_found: DocumentFieldValue[];
  similarity_score?: number;
  mismatch_reason?: string;
  created_at?: string;
}
