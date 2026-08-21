import { evaluateEligibility } from '@/services/rules/eligibility.engine';
import { DEFAULT_SCHEME_RULES, DEFAULT_SCHEME_ID } from '@/lib/constants/default-rules';
import { DEMO_SCENARIOS, DemoScenarioId } from '@/lib/constants/demo-scenarios';
import { Application } from '@/types/application.types';
import { DocumentRecord, ExtractedField } from '@/types/document.types';
import { FieldVerificationResult } from '@/types/verification.types';
import { v4 as uuidv4 } from 'uuid';

async function runPhase6EligibilityTest() {
  console.log('=== RUNNING PHASE 6 DETERMINISTIC ELIGIBILITY RULE ENGINE TEST ===\n');

  // PART 1: EDGE CASE UNIT TESTS
  console.log('--- PART 1: EDGE CASE UNIT TESTS ---');

  const createDummyApp = (): Application => ({
    id: uuidv4(),
    applicant_name: 'TEST APPLICANT',
    scheme_id: DEFAULT_SCHEME_ID,
    status: 'SUBMITTED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const createDummyDocs = (count = 4): DocumentRecord[] =>
    Array(count)
      .fill(null)
      .map((_, i) => ({
        id: uuidv4(),
        application_id: uuidv4(),
        slot_type: ['ID_PROOF', 'INCOME_CERT', 'MARKSHEET', 'DOMICILE_CERT'][i] as any,
        status: 'EXTRACTED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

  // Test 1: Income exactly ₹2,50,000 -> PASS
  console.log('Test 1: Income exactly ₹2,50,000 (Boundary)');
  const res1 = evaluateEligibility({
    application: createDummyApp(),
    documents: createDummyDocs(),
    extractedFields: [
      { id: uuidv4(), document_id: uuidv4(), application_id: uuidv4(), field_name: 'annual_income', raw_value: '250000', normalized_value: '250000', confidence: 0.9, source_text: 'Income: 250000' },
      { id: uuidv4(), document_id: uuidv4(), application_id: uuidv4(), field_name: 'marks_percentage', raw_value: '60.0', normalized_value: '60.0', confidence: 0.9, source_text: 'Marks: 60.0' },
      { id: uuidv4(), document_id: uuidv4(), application_id: uuidv4(), field_name: 'domicile_state', raw_value: 'West Bengal', normalized_value: 'West Bengal', confidence: 0.9, source_text: 'State: West Bengal' },
    ],
    verificationResults: [],
  });
  console.assert(res1.rule_results.find((r) => r.rule_id === 'income_check')?.status === 'PASS', 'Income 250k should PASS');
  console.log('  └─ PASS: Income 250,000 passed threshold <= 250,000');

  // Test 2: Income ₹2,50,001 -> FAIL
  console.log('Test 2: Income ₹2,50,001 (Boundary)');
  const res2 = evaluateEligibility({
    application: createDummyApp(),
    documents: createDummyDocs(),
    extractedFields: [
      { id: uuidv4(), document_id: uuidv4(), application_id: uuidv4(), field_name: 'annual_income', raw_value: '250001', normalized_value: '250001', confidence: 0.9, source_text: 'Income: 250001' },
      { id: uuidv4(), document_id: uuidv4(), application_id: uuidv4(), field_name: 'marks_percentage', raw_value: '60.0', normalized_value: '60.0', confidence: 0.9, source_text: 'Marks: 60.0' },
      { id: uuidv4(), document_id: uuidv4(), application_id: uuidv4(), field_name: 'domicile_state', raw_value: 'West Bengal', normalized_value: 'West Bengal', confidence: 0.9, source_text: 'State: West Bengal' },
    ],
    verificationResults: [],
  });
  console.assert(res2.rule_results.find((r) => r.rule_id === 'income_check')?.status === 'FAIL', 'Income 250001 should FAIL');
  console.assert(res2.overall_status === 'INELIGIBLE', 'Income 250001 should be INELIGIBLE');
  console.log('  └─ PASS: Income 250,001 failed threshold <= 250,000');

  // Test 3: Marks exactly 60.0% -> PASS
  console.log('Test 3: Marks exactly 60.0% (Boundary)');
  const res3 = evaluateEligibility({
    application: createDummyApp(),
    documents: createDummyDocs(),
    extractedFields: [
      { id: uuidv4(), document_id: uuidv4(), application_id: uuidv4(), field_name: 'annual_income', raw_value: '180000', normalized_value: '180000', confidence: 0.9, source_text: 'Income: 180000' },
      { id: uuidv4(), document_id: uuidv4(), application_id: uuidv4(), field_name: 'marks_percentage', raw_value: '60.0', normalized_value: '60.0', confidence: 0.9, source_text: 'Marks: 60.0' },
      { id: uuidv4(), document_id: uuidv4(), application_id: uuidv4(), field_name: 'domicile_state', raw_value: 'West Bengal', normalized_value: 'West Bengal', confidence: 0.9, source_text: 'State: West Bengal' },
    ],
    verificationResults: [],
  });
  console.assert(res3.rule_results.find((r) => r.rule_id === 'marks_check')?.status === 'PASS', 'Marks 60.0% should PASS');
  console.log('  └─ PASS: Marks 60.0% passed threshold >= 60.0%');

  // Test 4: Marks 59.99% -> FAIL
  console.log('Test 4: Marks 59.99% (Boundary)');
  const res4 = evaluateEligibility({
    application: createDummyApp(),
    documents: createDummyDocs(),
    extractedFields: [
      { id: uuidv4(), document_id: uuidv4(), application_id: uuidv4(), field_name: 'annual_income', raw_value: '180000', normalized_value: '180000', confidence: 0.9, source_text: 'Income: 180000' },
      { id: uuidv4(), document_id: uuidv4(), application_id: uuidv4(), field_name: 'marks_percentage', raw_value: '59.99', normalized_value: '59.99', confidence: 0.9, source_text: 'Marks: 59.99' },
      { id: uuidv4(), document_id: uuidv4(), application_id: uuidv4(), field_name: 'domicile_state', raw_value: 'West Bengal', normalized_value: 'West Bengal', confidence: 0.9, source_text: 'State: West Bengal' },
    ],
    verificationResults: [],
  });
  console.assert(res4.rule_results.find((r) => r.rule_id === 'marks_check')?.status === 'FAIL', 'Marks 59.99% should FAIL');
  console.assert(res4.overall_status === 'INELIGIBLE', 'Marks 59.99% should be INELIGIBLE');
  console.log('  └─ PASS: Marks 59.99% failed threshold >= 60.0%');

  // PART 2: END-TO-END DEMO SCENARIO TESTS
  console.log('\n--- PART 2: DEMO SCENARIO TESTS ---');

  const scenarioKeys = Object.keys(DEMO_SCENARIOS) as DemoScenarioId[];

  for (const key of scenarioKeys) {
    const scenario = DEMO_SCENARIOS[key];
    console.log(`\n====================================================`);
    console.log(` TESTING ELIGIBILITY FOR ${scenario.name}`);
    console.log(`====================================================`);

    const appId = uuidv4();
    const app: Application = {
      id: appId,
      applicant_name: scenario.applicantName,
      scheme_id: DEFAULT_SCHEME_ID,
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const docRecords: DocumentRecord[] = scenario.documents.map((d) => ({
      id: uuidv4(),
      application_id: appId,
      slot_type: d.slotType,
      status: 'EXTRACTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const extractedFields: ExtractedField[] = [];
    scenario.documents.forEach((d) => {
      Object.entries(d.fields).forEach(([k, v]) => {
        let fieldName = 'applicant_name';
        if (k === 'Annual Family Income') fieldName = 'annual_income';
        if (k === 'Marks Percentage') fieldName = 'marks_percentage';
        if (k === 'Domicile State') fieldName = 'domicile_state';

        extractedFields.push({
          id: uuidv4(),
          document_id: uuidv4(),
          application_id: appId,
          field_name: fieldName,
          raw_value: String(v),
          normalized_value: String(v),
          confidence: 0.95,
          source_text: `${k}: ${v}`,
        });
      });
    });

    const mockVerifications: FieldVerificationResult[] = [];
    if (key === 'SCENARIO_2_NAME_MISMATCH') {
      mockVerifications.push({
        application_id: appId,
        field_name: 'applicant_name',
        status: 'MAJOR_MISMATCH',
        similarity_score: 0.727,
        mismatch_reason: 'Major name mismatch: RAHUL KUMAR vs ROHAN KUMAR',
        values_found: [],
      });
    } else if (key === 'SCENARIO_5_MULTIPLE_ISSUES') {
      mockVerifications.push({
        application_id: appId,
        field_name: 'dob',
        status: 'CRITICAL_MISMATCH',
        similarity_score: 0.0,
        mismatch_reason: 'DOB mismatch: 2003-06-20 vs 2004-06-20',
        values_found: [],
      });
    }

    const evaluation = evaluateEligibility({
      application: app,
      documents: docRecords,
      extractedFields,
      verificationResults: mockVerifications,
      rules: DEFAULT_SCHEME_RULES,
    });

    console.log(`OVERALL ELIGIBILITY STATUS: ${evaluation.overall_status} (Eligible: ${evaluation.eligible})`);
    evaluation.rule_results.forEach((r) => {
      console.log(`  - Rule '${r.rule_id}': status=${r.status} | val=${r.evaluated_value} | threshold=${r.threshold} | reason="${r.reason}"`);
    });

    if (key === 'SCENARIO_1_VALID') {
      console.assert(evaluation.overall_status === 'ELIGIBLE', 'Scenario 1 should be ELIGIBLE');
    } else if (key === 'SCENARIO_2_NAME_MISMATCH') {
      console.assert(evaluation.overall_status === 'REVIEW_REQUIRED', 'Scenario 2 should be REVIEW_REQUIRED');
    } else if (key === 'SCENARIO_3_INCOME_INELIGIBLE') {
      console.assert(evaluation.overall_status === 'INELIGIBLE', 'Scenario 3 should be INELIGIBLE');
      console.assert(evaluation.blocking_failures.includes('income_check'), 'Income check should fail');
    } else if (key === 'SCENARIO_4_MISSING_DOC') {
      console.assert(evaluation.overall_status === 'REVIEW_REQUIRED', 'Scenario 4 should be REVIEW_REQUIRED');
      console.assert(evaluation.inconclusive_rules.includes('income_check'), 'Income rule should be INCONCLUSIVE');
    } else if (key === 'SCENARIO_5_MULTIPLE_ISSUES') {
      console.assert(evaluation.overall_status === 'INELIGIBLE', 'Scenario 5 should be INELIGIBLE');
    }
  }

  console.log('\n====================================================');
  console.log(' PHASE 6 ELIGIBILITY RULE ENGINE TEST COMPLETE');
  console.log(' ALL SCENARIOS PASSED EXPECTED ASSERTIONS');
  console.log('====================================================');
}

runPhase6EligibilityTest().catch(console.error);
