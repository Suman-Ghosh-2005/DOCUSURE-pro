export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type JobStage = 'OCR' | 'AI_EXTRACTION' | 'VERIFICATION' | 'ELIGIBILITY' | 'RISK' | 'COMPLETED' | 'FAILED';

export interface ProcessingJob {
  id: string;
  application_id: string;
  status: JobStatus;
  current_stage: JobStage;
  attempts: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}
