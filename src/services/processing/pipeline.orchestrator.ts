import { ApplicationStatus } from '@/types/application.types';

/**
 * Pipeline Orchestrator (Phase 0 Skeleton)
 * Sequentially executes file validation, OCR, AI extraction, normalization,
 * cross-document verification, rule evaluation, exception detection, and routing.
 */

export interface PipelineRunResult {
  application_id: string;
  status: ApplicationStatus;
  routing_reason: string;
}

export async function runDocumentPipeline(
  applicationId: string
): Promise<PipelineRunResult> {
  console.log(`[Pipeline Orchestrator Placeholder] Starting pipeline for application: ${applicationId}`);
  return {
    application_id: applicationId,
    status: 'PROCESSING',
    routing_reason: 'Pipeline initialization in progress',
  };
}
