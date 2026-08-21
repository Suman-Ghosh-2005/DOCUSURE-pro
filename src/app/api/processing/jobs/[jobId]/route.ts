import { NextRequest, NextResponse } from 'next/server';
import { JobRepository } from '@/repositories/job.repository';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    const job = await JobRepository.getById(jobId);

    if (!job) {
      return NextResponse.json(
        { data: null, error: { message: 'Job not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        jobId: job.id,
        applicationId: job.application_id,
        status: job.status,
        currentStage: job.current_stage,
        attempts: job.attempts,
        errorMessage: job.error_message,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
      },
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch job status';
    console.error('[Job Status API Error]:', error);
    return NextResponse.json(
      { data: null, error: { message, code: 'JOB_STATUS_ERROR' } },
      { status: 500 }
    );
  }
}
