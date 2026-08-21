-- 11. RISK RESULTS TABLE (Phase 9 ML Risk Intelligence)
CREATE TABLE IF NOT EXISTS risk_results (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  processing_job_id     UUID REFERENCES processing_jobs(id) ON DELETE SET NULL,
  risk_score            INTEGER NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  risk_level            VARCHAR(50) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
  feature_snapshot      JSONB NOT NULL,
  contributing_signals  JSONB NOT NULL,
  model_name            VARCHAR(100) NOT NULL DEFAULT 'IsolationForest_v1',
  model_version         VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_results_app ON risk_results(application_id);
CREATE INDEX IF NOT EXISTS idx_risk_results_level ON risk_results(risk_level);

ALTER TABLE risk_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to risk results"
  ON risk_results FOR SELECT USING (true);
