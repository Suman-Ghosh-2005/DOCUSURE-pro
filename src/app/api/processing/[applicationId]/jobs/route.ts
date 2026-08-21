import { NextRequest, NextResponse } from 'next/server';
import { ApplicationRepository } from '@/repositories/application.repository';
import { JobRepository } from '@/repositories/job.repository';
import { processJobAsync } from '@/services/jobs/worker.service';

let jobCreationCounter = 0;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ applicationId: string }> }
) {
  try {
    jobCreationCounter++;
    const { applicationId } = await context.params;

    console.log(`[DOCUSURE JOB] job creation request #${jobCreationCounter} applicationId=${applicationId}`);

    const application = await ApplicationRepository.getById(applicationId);

    if (!application) {
      return NextResponse.json(
        { data: null, error: { message: 'Application not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Check for existing active processing job to prevent duplicate active jobs (BUG 4)
    const activeJob = await JobRepository.getActiveByApplicationId(applicationId);
    if (activeJob) {
      console.log(`[DOCUSURE JOB] Active job ${activeJob.id} already exists for ${applicationId}. Reusing active job.`);
      return NextResponse.json({
        data: {
          jobId: activeJob.id,
          applicationId: activeJob.application_id,
          status: activeJob.status,
          currentStage: activeJob.current_stage,
          attempts: activeJob.attempts,
          createdAt: activeJob.created_at,
        },
        error: null,
      });
    }

    // Create new QUEUED job
    const job = await JobRepository.create(applicationId);
    if (!job) {
      return NextResponse.json(
        { data: null, error: { message: 'Failed to create processing job', code: 'DB_ERROR' } },
        { status: 500 }
      );
    }

    console.log(`[DOCUSURE JOB] Created QUEUED job ${job.id} for ${applicationId}`);

    // Launch asynchronous worker off the HTTP request thread
    await processJobAsync(job.id);

    return NextResponse.json(
      {
        data: {
          jobId: job.id,
          applicationId: job.application_id,
          status: job.status,
          currentStage: job.current_stage,
          attempts: job.attempts,
          createdAt: job.created_at,
        },
        error: null,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create job';
    console.error('[Job Creation API Error]:', error);
    return NextResponse.json(
      { data: null, error: { message, code: 'JOB_CREATION_ERROR' } },
      { status: 500 }
    );
  }
}
