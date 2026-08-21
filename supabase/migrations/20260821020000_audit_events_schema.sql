-- 12. AUDIT EVENTS TABLE (Phase 10 Tamper-Evident Audit Chain)
CREATE TABLE IF NOT EXISTS audit_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id      UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  processing_job_id   UUID REFERENCES processing_jobs(id) ON DELETE SET NULL,
  event_type          VARCHAR(100) NOT NULL,
  event_data          JSONB NOT NULL,
  previous_hash       VARCHAR(64),
  event_hash          VARCHAR(64) NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  actor_type          VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  actor_id            VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_audit_events_app ON audit_events(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to audit events"
  ON audit_events FOR SELECT USING (true);
