export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'VERIFIED'
  | 'EXCEPTION'
  | 'INELIGIBLE'
  | 'INCOMPLETE'
  | 'APPROVED'
  | 'REJECTED';

export interface Application {
  id: string;
  applicant_user_id?: string | null;
  applicant_name: string;
  dob?: string;
  gender?: string;
  scheme_id: string;
  status: ApplicationStatus;
  routing_reason?: string | null;
  processing_stage?: string | null;
  submitted_at?: string | null;
  processed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateApplicationPayload {
  applicant_user_id?: string | null;
  applicant_name: string;
  dob?: string;
  gender?: string;
  scheme_id: string;
}

export interface ProcessingStatusResponse {
  application_id: string;
  status: ApplicationStatus;
  current_stage: string;
  completed_stages: string[];
  total_stages: number;
  is_complete: boolean;
  error?: string;
}
