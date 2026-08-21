export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskFeatures {
  document_count: number;
  missing_document_count: number;
  average_ocr_confidence: number;
  average_extraction_confidence: number;
  minimum_extraction_confidence: number;
  name_similarity: number;
  dob_consistency: number;
  verification_mismatch_count: number;
  critical_exception_count: number;
  warning_exception_count: number;
  eligibility_rule_failure_count: number;
  income_distance_from_threshold: number;
  document_completeness: number;
}

export interface RiskPredictionResult {
  risk_score: number; // 0 - 100
  risk_level: RiskLevel;
  contributing_signals: string[];
  feature_snapshot: RiskFeatures;
  model_name: string;
  model_version: string;
}

export interface RiskRecord extends RiskPredictionResult {
  id: string;
  application_id: string;
  processing_job_id?: string | null;
  created_at: string;
}
