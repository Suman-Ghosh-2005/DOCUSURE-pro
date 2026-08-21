import { NextRequest, NextResponse, after } from 'next/server';
import { ApplicationRepository } from '@/repositories/application.repository';
import { JobRepository } from '@/repositories/job.repository';
import { executeJobWorker } from '@/services/jobs/worker.service';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

let jobCreationCounter = 0;

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ applicationId: string }> }
) {
  try {
    jobCreationCounter++;
    const { applicationId } = await context.params;

    console.log(`[PROD WORKER] API Request #${jobCreationCounter} for applicationId=${applicationId}`);

    const application = await ApplicationRepository.getById(applicationId);

    if (!application) {
      return NextResponse.json(
        { data: null, error: { message: 'Application not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    // Check for existing active processing job to prevent duplicate active jobs
    const activeJob = await JobRepository.getActiveByApplicationId(applicationId);
    if (activeJob) {
      console.log(`[PROD WORKER] Active job ${activeJob.id} already exists for ${applicationId}. Reusing active job.`);
      
      // Ensure worker executes if previously queued/stalled
      after(async () => {
        try {
          await executeJobWorker(activeJob.id);
        } catch (err) {
          console.error(`[PROD WORKER] JOB ERROR jobId=${activeJob.id} stage=REUSE_AFTER error=`, err);
        }
      });

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

    console.log(`[PROD WORKER] Created QUEUED job ${job.id} for ${applicationId}`);

    // Schedule background worker post-response using Next.js after() (supported by Vercel Serverless)
    after(async () => {
      try {
        await executeJobWorker(job.id);
      } catch (err) {
        console.error(`[PROD WORKER] JOB ERROR jobId=${job.id} stage=POST_RESPONSE_AFTER error=`, err);
      }
    });

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
    console.error('[PROD WORKER] API Exception:', error);
    return NextResponse.json(
      { data: null, error: { message, code: 'JOB_CREATION_ERROR' } },
      { status: 500 }
    );
  }
}
