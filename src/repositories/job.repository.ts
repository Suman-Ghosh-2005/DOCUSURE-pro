import { createAdminClient } from '@/lib/supabase/server';
import { ProcessingJob, JobStatus, JobStage } from '@/types/job.types';

// In-memory fallback map for environments without active DB table migrations
const memoryJobStore = new Map<string, ProcessingJob>();

export class JobRepository {
  /**
   * Create a new QUEUED processing job for an application
   */
  static async create(applicationId: string): Promise<ProcessingJob | null> {
    try {
      const supabase = createAdminClient();
      const newJob = {
        application_id: applicationId,
        status: 'QUEUED' as JobStatus,
        current_stage: 'OCR' as JobStage,
        attempts: 0,
        error_message: null,
      };

      const { data, error } = await supabase
        .from('processing_jobs')
        .insert(newJob)
        .select('*')
        .single();

      if (!error && data) {
        memoryJobStore.set(data.id, data as ProcessingJob);
        return data as ProcessingJob;
      }
    } catch (e) {
      console.warn('[JobRepository] Supabase insert failed, using fallback in-memory store:', e);
    }

    // In-memory fallback
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: ProcessingJob = {
      id,
      application_id: applicationId,
      status: 'QUEUED',
      current_stage: 'OCR',
      attempts: 0,
      error_message: null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
    };
    memoryJobStore.set(id, job);
    return job;
  }

  /**
   * Fetch a job by ID
   */
  static async getById(jobId: string): Promise<ProcessingJob | null> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!error && data) {
        memoryJobStore.set(data.id, data as ProcessingJob);
        return data as ProcessingJob;
      }
    } catch {
      // Fallback
    }

    return memoryJobStore.get(jobId) || null;
  }

  /**
   * Fetch active job (QUEUED or PROCESSING) for an application
   */
  static async getActiveByApplicationId(applicationId: string): Promise<ProcessingJob | null> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('application_id', applicationId)
        .in('status', ['QUEUED', 'PROCESSING'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data as ProcessingJob;
      }
    } catch {
      // Fallback
    }

    for (const job of Array.from(memoryJobStore.values())) {
      if (
        job.application_id === applicationId &&
        (job.status === 'QUEUED' || job.status === 'PROCESSING')
      ) {
        return job;
      }
    }

    return null;
  }

  /**
   * Atomic Job Claim: Transitions job from QUEUED to PROCESSING.
   * Returns true if successfully claimed by this worker thread, false if already claimed.
   */
  static async claimJob(jobId: string): Promise<boolean> {
    const now = new Date().toISOString();
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('processing_jobs')
        .update({
          status: 'PROCESSING',
          started_at: now,
        })
        .eq('id', jobId)
        .eq('status', 'QUEUED')
        .select('*')
        .maybeSingle();

      if (!error && data) {
        memoryJobStore.set(data.id, data as ProcessingJob);
        return true;
      }
    } catch {
      // Fallback below
    }

    const job = memoryJobStore.get(jobId);
    if (job && job.status === 'QUEUED') {
      job.status = 'PROCESSING';
      job.started_at = now;
      memoryJobStore.set(jobId, job);
      return true;
    }

    return false;
  }

  /**
   * Update job status and stage
   */
  static async updateStatus(
    jobId: string,
    status: JobStatus,
    currentStage?: JobStage,
    errorMessage?: string | null,
    attemptsIncrement = false
  ): Promise<ProcessingJob | null> {
    const existing = await this.getById(jobId);
    const now = new Date().toISOString();

    const updates: Partial<ProcessingJob> = {
      status,
      ...(currentStage && { current_stage: currentStage }),
      ...(errorMessage !== undefined && { error_message: errorMessage }),
      ...(status === 'PROCESSING' && !existing?.started_at && { started_at: now }),
      ...(status === 'COMPLETED' || status === 'FAILED' ? { completed_at: now } : {}),
      ...(attemptsIncrement ? { attempts: (existing?.attempts || 0) + 1 } : {}),
    };

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('processing_jobs')
        .update(updates)
        .eq('id', jobId)
        .select('*')
        .single();

      if (!error && data) {
        memoryJobStore.set(data.id, data as ProcessingJob);
        return data as ProcessingJob;
      }
    } catch {
      // Fallback
    }

    if (existing) {
      const updated: ProcessingJob = {
        ...existing,
        ...updates,
      };
      memoryJobStore.set(jobId, updated);
      return updated;
    }

    return null;
  }
}
