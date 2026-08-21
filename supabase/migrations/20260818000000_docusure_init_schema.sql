-- DOCUSURE PostgreSQL Schema Migration
-- Migration: 20260818000000_docusure_init_schema.sql

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SCHEMES TABLE
CREATE TABLE IF NOT EXISTS schemes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  description         TEXT,
  required_doc_types  JSONB NOT NULL DEFAULT '["ID_PROOF","INCOME_CERT","MARKSHEET","DOMICILE_CERT"]'::jsonb,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RULE VERSIONS TABLE
CREATE TABLE IF NOT EXISTS rule_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id   UUID NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  rules_json  JSONB NOT NULL,
  is_active   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_name    VARCHAR(255) NOT NULL,
  dob               DATE,
  gender            VARCHAR(20),
  scheme_id         UUID REFERENCES schemes(id),
  status            VARCHAR(50) NOT NULL DEFAULT 'DRAFT'
                      CHECK (status IN (
                        'DRAFT', 'SUBMITTED', 'PROCESSING', 'VERIFIED',
                        'EXCEPTION', 'INELIGIBLE', 'INCOMPLETE', 'APPROVED', 'REJECTED'
                      )),
  routing_reason    TEXT,
  processing_stage  VARCHAR(100),
  submitted_at      TIMESTAMPTZ,
  processed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id            UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  slot_type                 VARCHAR(100) NOT NULL
                              CHECK (slot_type IN ('ID_PROOF', 'INCOME_CERT', 'MARKSHEET', 'DOMICILE_CERT')),
  document_type             VARCHAR(100),
  status                    VARCHAR(50) DEFAULT 'UPLOADED'
                              CHECK (status IN (
                                'UPLOADED', 'PROCESSING', 'OCR_COMPLETE',
                                'CLASSIFIED', 'EXTRACTED', 'VERIFIED', 'FAILED'
                              )),
  storage_path              VARCHAR(500),
  original_filename         VARCHAR(255),
  mime_type                 VARCHAR(100),
  file_size_bytes           INTEGER,
  ocr_text                  TEXT,
  ocr_confidence            DECIMAL(4,3),
  classification_confidence DECIMAL(4,3),
  classification_reasoning  TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- 5. EXTRACTED FIELDS TABLE
CREATE TABLE IF NOT EXISTS extracted_fields (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  field_name      VARCHAR(100) NOT NULL,
  raw_value       TEXT,
  normalized_value TEXT,
  confidence      DECIMAL(4,3),
  source_text     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 6. VERIFICATION RESULTS TABLE
CREATE TABLE IF NOT EXISTS verification_results (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  field_name        VARCHAR(100) NOT NULL,
  status            VARCHAR(50) NOT NULL
                      CHECK (status IN (
                        'MATCH', 'MINOR_MISMATCH', 'MAJOR_MISMATCH',
                        'CRITICAL_MISMATCH', 'MISSING', 'SINGLE_SOURCE'
                      )),
  values_found      JSONB,
  similarity_score  DECIMAL(4,3),
  mismatch_reason   TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 7. RULE RESULTS TABLE
CREATE TABLE IF NOT EXISTS rule_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  rule_id         VARCHAR(100) NOT NULL,
  rule_name       VARCHAR(255),
  status          VARCHAR(50) NOT NULL
                    CHECK (status IN ('PASS', 'FAIL', 'INCONCLUSIVE', 'ERROR')),
  evaluated_value TEXT,
  threshold       TEXT,
  operator        VARCHAR(50),
  reason          TEXT,
  is_blocking     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EXCEPTIONS TABLE
CREATE TABLE IF NOT EXISTS exceptions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  type              VARCHAR(100) NOT NULL,
  severity          VARCHAR(50) NOT NULL
                      CHECK (severity IN ('INFO', 'WARNING', 'MAJOR', 'CRITICAL')),
  is_blocking       BOOLEAN DEFAULT false,
  field_name        VARCHAR(100),
  document_ids      UUID[],
  values_compared   JSONB,
  description       TEXT NOT NULL,
  recommended_action TEXT,
  ai_explanation    TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 9. OFFICER REVIEWS TABLE
CREATE TABLE IF NOT EXISTS officer_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID NOT NULL REFERENCES applications(id),
  decision          VARCHAR(50) NOT NULL
                      CHECK (decision IN ('APPROVE', 'REJECT', 'REQUEST_CORRECTION')),
  notes             TEXT NOT NULL,
  rejection_reasons JSONB,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_applications_scheme ON applications(scheme_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_documents_app ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_app ON extracted_fields(application_id);
CREATE INDEX IF NOT EXISTS idx_verification_results_app ON verification_results(application_id);
CREATE INDEX IF NOT EXISTS idx_rule_results_app ON rule_results(application_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_app ON exceptions(application_id);
CREATE INDEX IF NOT EXISTS idx_officer_reviews_app ON officer_reviews(application_id);

-- SECURITY: ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE officer_reviews ENABLE ROW LEVEL SECURITY;

-- RESTRICTED RLS POLICIES (No broad public write access)
-- Server-side operations run via service role key which bypasses RLS
CREATE POLICY "Allow public read access to active schemes"
  ON schemes FOR SELECT USING (true);

CREATE POLICY "Allow public read access to active rule versions"
  ON rule_versions FOR SELECT USING (is_active = true);
