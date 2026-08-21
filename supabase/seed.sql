-- DOCUSURE Seed Script
-- Seed Default Scheme and Active Rule Version

-- 1. SEED DEFAULT SCHEME (Valid UUID)
INSERT INTO schemes (id, name, description, required_doc_types)
VALUES (
  'a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d'::uuid,
  'West Bengal State Merit Scholarship',
  'State government scholarship scheme for higher education students meeting merit and income criteria.',
  '["ID_PROOF", "INCOME_CERT", "MARKSHEET", "DOMICILE_CERT"]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 2. SEED ACTIVE RULE VERSION 1.0
INSERT INTO rule_versions (id, scheme_id, version, rules_json, is_active)
VALUES (
  'b2c3d4e5-f6a7-5b6c-7d8e-9f0a1b2c3d4e'::uuid,
  'a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d'::uuid,
  1,
  '{
    "scheme_name": "West Bengal State Merit Scholarship",
    "version": 1,
    "rules": [
      {
        "id": "income_check",
        "name": "Income Eligibility",
        "description": "Annual family income must not exceed ₹2,50,000",
        "is_blocking": true,
        "condition": {
          "type": "LEAF",
          "field": "annual_income",
          "operator": "LTE",
          "value": 250000
        }
      },
      {
        "id": "marks_check",
        "name": "Academic Merit Requirement",
        "description": "Marks percentage must be at least 60.0%",
        "is_blocking": true,
        "condition": {
          "type": "LEAF",
          "field": "marks_percentage",
          "operator": "GTE",
          "value": 60.0
        }
      },
      {
        "id": "domicile_check",
        "name": "State Domicile Requirement",
        "description": "Applicant must be domiciled in West Bengal",
        "is_blocking": true,
        "condition": {
          "type": "LEAF",
          "field": "domicile_state",
          "operator": "EQ",
          "value": "West Bengal"
        }
      }
    ]
  }'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;
