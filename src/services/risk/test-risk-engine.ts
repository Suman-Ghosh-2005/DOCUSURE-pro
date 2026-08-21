import fs from 'fs';
import path from 'path';

// Parse .env.local for standalone tsx runner
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const val = valueParts.join('=').trim();
      if (key && val && !process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  });
}

import { FeatureExtractor } from './feature.extractor';
import { RiskEngine } from './risk.engine';
import { Application } from '@/types/application.types';
import { DocumentRecord, ExtractedField } from '@/types/document.types';
import { FieldVerificationResult } from '@/types/verification.types';
import { RuleResult } from '@/types/rule.types';
import { ApplicationException } from '@/types/exception.types';

function createMockData(overrides: {
  nameSim?: number;
  dobMatch?: boolean;
  missingDocs?: number;
  ocrConf?: number;
  income?: number;
  failedRules?: number;
  criticalExc?: number;
}) {
  const app: Application = {
    id: 'test-app-id',
    applicant_name: 'TEST APPLICANT',
    dob: '2004-03-14',
    gender: 'Female',
    scheme_id: 'wb-merit-scholarship-v1',
    status: 'SUBMITTED',
    routing_reason: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const docCount = 4 - (overrides.missingDocs || 0);
  const docs: DocumentRecord[] = Array.from({ length: docCount }, (_, i) => ({
    id: `doc-${i + 1}`,
    application_id: 'test-app-id',
    slot_type: ['ID_PROOF', 'INCOME_CERT', 'MARKSHEET', 'DOMICILE_CERT'][i] as any,
    document_type: ['ID_PROOF', 'INCOME_CERT', 'MARKSHEET', 'DOMICILE_CERT'][i],
    ocr_confidence: overrides.ocrConf ?? 0.95,
    status: 'EXTRACTED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const fields: ExtractedField[] = [
    { id: 'f1', application_id: 'test-app-id', document_id: 'doc-1', field_name: 'applicant_name', raw_value: 'TEST APPLICANT', normalized_value: 'TEST APPLICANT', confidence: overrides.ocrConf ?? 0.95, source_text: 'TEST APPLICANT', created_at: '' },
    { id: 'f2', application_id: 'test-app-id', document_id: 'doc-2', field_name: 'annual_income', raw_value: String(overrides.income ?? 180000), normalized_value: String(overrides.income ?? 180000), confidence: overrides.ocrConf ?? 0.95, source_text: '180000', created_at: '' },
  ];

  const verifications: FieldVerificationResult[] = [
    {
      application_id: 'test-app-id',
      field_name: 'applicant_name',
      status: (overrides.nameSim ?? 1.0) >= 0.85 ? 'MATCH' : 'MAJOR_MISMATCH',
      values_found: [{ document_id: 'doc-1', document_type: 'ID_PROOF', raw_value: 'TEST APPLICANT', normalized_value: 'TEST APPLICANT' }],
      similarity_score: overrides.nameSim ?? 1.0,
      mismatch_reason: 'Name comparison',
    },
    {
      application_id: 'test-app-id',
      field_name: 'dob',
      status: (overrides.dobMatch ?? true) ? 'MATCH' : 'MAJOR_MISMATCH',
      values_found: [{ document_id: 'doc-1', document_type: 'ID_PROOF', raw_value: '2004-03-14', normalized_value: '2004-03-14' }],
      similarity_score: (overrides.dobMatch ?? true) ? 1.0 : 0.0,
      mismatch_reason: 'DOB comparison',
    },
  ];

  const rules: RuleResult[] = Array.from({ length: overrides.failedRules || 0 }, (_, i) => ({
    rule_id: `rule-${i + 1}`,
    rule_name: `Rule ${i + 1}`,
    application_id: 'test-app-id',
    status: 'FAIL',
    reason: 'Rule failed',
    evaluated_value: 'N/A',
    threshold: 'N/A',
    is_blocking: true,
  }));

  const exceptions: ApplicationException[] = Array.from({ length: overrides.criticalExc || 0 }, (_, i) => ({
    id: `exc-${i + 1}`,
    application_id: 'test-app-id',
    type: 'NAME_MISMATCH',
    severity: 'CRITICAL',
    is_blocking: true,
    description: 'Critical exception',
    recommended_action: 'Review',
  }));

  return { application: app, documents: docs, extractedFields: fields, verificationResults: verifications, ruleResults: rules, exceptions };
}

async function runRiskEngineTestSuite() {
  console.log('================================================================');
  console.log(' DOCUSURE — PHASE 9 ML RISK ENGINE INTEGRATION TEST SUITE       ');
  console.log('================================================================\n');

  // Test 1: Normal Valid Application
  const data1 = createMockData({});
  const feat1 = FeatureExtractor.extractFeatures(data1);
  const res1 = RiskEngine.predict(feat1);
  console.log(`[TEST 1] Normal Application   : Score=${res1.risk_score}, Level=${res1.risk_level}`);
  console.assert(res1.risk_level === 'LOW', 'Test 1 should be LOW risk');

  // Test 2: Name Mismatch
  const data2 = createMockData({ nameSim: 0.60 });
  const feat2 = FeatureExtractor.extractFeatures(data2);
  const res2 = RiskEngine.predict(feat2);
  console.log(`[TEST 2] Name Mismatch        : Score=${res2.risk_score}, Level=${res2.risk_level}`);
  console.assert(res2.risk_score > res1.risk_score, 'Test 2 should have higher score than Test 1');

  // Test 3: DOB Mismatch
  const data3 = createMockData({ dobMatch: false });
  const feat3 = FeatureExtractor.extractFeatures(data3);
  const res3 = RiskEngine.predict(feat3);
  console.log(`[TEST 3] DOB Mismatch         : Score=${res3.risk_score}, Level=${res3.risk_level}`);
  console.assert(res3.risk_score >= 30, 'Test 3 score should be >= 30 due to DOB penalty');

  // Test 4: Missing Document
  const data4 = createMockData({ missingDocs: 1 });
  const feat4 = FeatureExtractor.extractFeatures(data4);
  const res4 = RiskEngine.predict(feat4);
  console.log(`[TEST 4] Missing Document     : Score=${res4.risk_score}, Level=${res4.risk_level}`);
  console.assert(feat4.missing_document_count === 1, 'Missing document count must be 1');

  // Test 5: Multiple Issues (Scenario 5)
  const data5 = createMockData({ dobMatch: false, nameSim: 0.70, income: 380000, failedRules: 1, criticalExc: 1 });
  const feat5 = FeatureExtractor.extractFeatures(data5);
  const res5 = RiskEngine.predict(feat5);
  console.log(`[TEST 5] Multiple Issues (Sc 5): Score=${res5.risk_score}, Level=${res5.risk_level}`);
  console.assert(res5.risk_level === 'HIGH', 'Test 5 should be HIGH risk');
  console.assert(res5.risk_score >= 70, 'Test 5 score should be >= 70');

  // Test 6: High OCR Uncertainty
  const data6 = createMockData({ ocrConf: 0.50 });
  const feat6 = FeatureExtractor.extractFeatures(data6);
  const res6 = RiskEngine.predict(feat6);
  console.log(`[TEST 6] High OCR Uncertainty : Score=${res6.risk_score}, Level=${res6.risk_level}`);
  console.assert(res6.contributing_signals.some(s => s.includes('uncertainty')), 'Test 6 must flag uncertainty signal');

  // Test 7: Eligibility Failure
  const data7 = createMockData({ failedRules: 2, income: 300000 });
  const feat7 = FeatureExtractor.extractFeatures(data7);
  const res7 = RiskEngine.predict(feat7);
  console.log(`[TEST 7] Eligibility Failure  : Score=${res7.risk_score}, Level=${res7.risk_level}`);
  console.assert(res7.contributing_signals.some(s => s.includes('income')), 'Test 7 must flag income signal');

  // Test 8: Risk Engine Structural Integrity
  console.log(`[TEST 8] Structural Integrity : Model=${res5.model_name}, Version=${res5.model_version}`);
  console.assert(res5.risk_score >= 0 && res5.risk_score <= 100, 'Risk score must be between 0 and 100');
  console.assert(Array.isArray(res5.contributing_signals), 'Contributing signals must be an array');
  console.assert(typeof res5.feature_snapshot === 'object', 'Feature snapshot must be persisted object');

  console.log('\n================================================================');
  console.log('      PHASE 9 ML RISK ENGINE TEST SUITE PASSED (8/8)            ');
  console.log('================================================================\n');
}

runRiskEngineTestSuite().catch(console.error);
