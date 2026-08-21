export type ExceptionSeverity = 'INFO' | 'WARNING' | 'MAJOR' | 'CRITICAL';

export type ExceptionType =
  | 'DOCUMENT_MISSING'
  | 'OCR_LOW_CONFIDENCE'
  | 'UNKNOWN_DOCUMENT_TYPE'
  | 'WRONG_DOCUMENT_TYPE'
  | 'FIELD_EXTRACTION_FAILED'
  | 'FIELD_MISSING'
  | 'NAME_MISMATCH'
  | 'DOB_MISMATCH'
  | 'RULE_FAIL'
  | 'RULE_INCONCLUSIVE'
  | 'DOCUMENT_EXPIRED';

export interface ApplicationException {
  id?: string;
  application_id: string;
  type: ExceptionType;
  severity: ExceptionSeverity;
  is_blocking: boolean;
  field_name?: string;
  document_ids?: string[];
  values_compared?: Record<string, unknown>;
  description: string;
  recommended_action: string;
  ai_explanation?: string;
  created_at?: string;
}
