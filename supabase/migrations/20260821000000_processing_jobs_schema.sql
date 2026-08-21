-- 10. PROCESSING JOBS TABLE (Phase 8A Asynchronous Queue)
CREATE TABLE IF NOT EXISTS processing_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status          VARCHAR(50) NOT NULL DEFAULT 'QUEUED'
                    CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')),
  current_stage   VARCHAR(50) NOT NULL DEFAULT 'OCR'
                    CHECK (current_stage IN ('OCR', 'AI_EXTRACTION', 'VERIFICATION', 'ELIGIBILITY', 'COMPLETED', 'FAILED')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_app ON processing_jobs(application_id);
CREATE INDEX IF NOT EXISTS idx_processing_jobs_status ON processing_jobs(status);

ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to processing jobs"
  ON processing_jobs FOR SELECT USING (true);
