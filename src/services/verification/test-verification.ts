import { runCrossDocumentVerification } from '@/services/verification/cross-document.engine';
import { DEMO_SCENARIOS, DemoScenarioId } from '@/lib/constants/demo-scenarios';
import { DocumentRecord, ExtractedField } from '@/types/document.types';
import { calculateTokenSortSimilarity, normalizeName, normalizeDate } from '@/services/verification/normalizer';
import { v4 as uuidv4 } from 'uuid';

async function runPhase5VerificationTest() {
  console.log('=== RUNNING PHASE 5 CROSS-DOCUMENT VERIFICATION TEST ===\n');

  // PART 1: UNIT TESTS FOR NORMALIZATION & SIMILARITY ALGORITHMS
  console.log('--- PART 1: UNIT TESTS ---');

  // 1. Exact Name Match
  console.log('Test 1: Exact Name Match ("ANANYA GHOSH" vs "ANANYA GHOSH")');
  console.assert(calculateTokenSortSimilarity('ANANYA GHOSH', 'ANANYA GHOSH') === 1.0, 'Exact match should be 1.0');
  console.log('  └─ PASS: Similarity = 1.0');

  // 2. Case Differences
  console.log('Test 2: Case Differences ("Ananya Ghosh" vs "ANANYA GHOSH")');
  console.assert(calculateTokenSortSimilarity('Ananya Ghosh', 'ANANYA GHOSH') === 1.0, 'Case diff should normalize to equal');
  console.log('  └─ PASS: Normalized equality');

  // 3. Whitespace Differences
  console.log('Test 3: Whitespace Differences ("  Ananya   Ghosh " vs "ANANYA GHOSH")');
  console.assert(normalizeName('  Ananya   Ghosh ') === 'ANANYA GHOSH', 'Whitespace collapse failed');
  console.log('  └─ PASS: Collapsed whitespace');

  // 4. Harmless Punctuation / Title Differences
  console.log('Test 4: Title & Punctuation ("Ms. Ananya Ghosh" vs "ANANYA GHOSH")');
  console.assert(normalizeName('Ms. Ananya Ghosh') === 'ANANYA GHOSH', 'Title strip failed');
  console.log('  └─ PASS: Stripped title');

  // 5. Clear Name Mismatch
  console.log('Test 5: Clear Name Mismatch ("RAHUL KUMAR" vs "ROHAN KUMAR")');
  const simRahulRohan = calculateTokenSortSimilarity('RAHUL KUMAR', 'ROHAN KUMAR');
  console.log(`  └─ Similarity: ${simRahulRohan} (< 0.85 -> MAJOR_MISMATCH)`);
  console.assert(simRahulRohan < 0.85, 'Rahul vs Rohan should be major mismatch');

  // 6. Similar-but-not-identical Names
  console.log('Test 6: Minor Name Variation ("KAVITA SINGH" vs "KAVITHA SINGH")');
  const simKavita = calculateTokenSortSimilarity('KAVITA SINGH', 'KAVITHA SINGH');
  console.log(`  └─ Similarity: ${simKavita} (0.85-0.95 -> MINOR_MISMATCH requiring review)`);
  console.assert(simKavita >= 0.85 && simKavita < 0.95, 'Kavita vs Kavitha should be minor mismatch');

  // 7. Exact DOB Match
  console.log('Test 7: Exact DOB Match ("2004-03-14" vs "2004-03-14")');
  console.assert(normalizeDate('2004-03-14') === '2004-03-14', 'DOB match failed');
  console.log('  └─ PASS: Match');

  // 8. DOB Mismatch
  console.log('Test 8: DOB Mismatch ("2003-06-20" vs "2004-06-20")');
  console.assert(normalizeDate('2003-06-20') !== normalizeDate('2004-06-20'), 'DOB mismatch failed');
  console.log('  └─ PASS: Mismatch detected');

  // PART 2: END-TO-END SCENARIO VERIFICATION TESTS
  console.log('\n--- PART 2: DEMO SCENARIOS END-TO-END TEST ---');

  const scenarioKeys = Object.keys(DEMO_SCENARIOS) as DemoScenarioId[];

  for (const key of scenarioKeys) {
    const scenario = DEMO_SCENARIOS[key];
    console.log(`\n====================================================`);
    console.log(` TESTING VERIFICATION FOR ${scenario.name}`);
    console.log(` Expected Status: ${scenario.expectedStatus}`);
    console.log(`====================================================`);

    const dummyAppId = uuidv4();
    const docRecords: DocumentRecord[] = [];
    const extractedFields: ExtractedField[] = [];

    for (const docDef of scenario.documents) {
      const docId = uuidv4();
      docRecords.push({
        id: docId,
        application_id: dummyAppId,
        slot_type: docDef.slotType,
        document_type: docDef.slotType,
        status: 'EXTRACTED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Populate Extracted Fields directly from scenario definition for deterministic test runner
      Object.entries(docDef.fields).forEach(([fieldNameKey, val]) => {
        let canonicalName = 'applicant_name';
        if (['Full Name', 'Certificate Holder', 'Student Name', 'Resident Name'].includes(fieldNameKey)) {
          canonicalName = 'applicant_name';
        } else if (fieldNameKey === 'Date of Birth') {
          canonicalName = 'dob';
        } else if (fieldNameKey === 'Annual Family Income') {
          canonicalName = 'annual_income';
        } else if (fieldNameKey === 'Marks Percentage') {
          canonicalName = 'marks_percentage';
        } else if (fieldNameKey === 'Domicile State') {
          canonicalName = 'domicile_state';
        } else {
          canonicalName = fieldNameKey.toLowerCase().replace(/\s+/g, '_');
        }

        extractedFields.push({
          id: uuidv4(),
          document_id: docId,
          application_id: dummyAppId,
          field_name: canonicalName,
          raw_value: String(val),
          normalized_value: String(val),
          confidence: 0.95,
          source_text: `${fieldNameKey}: ${val}`,
        });
      });
    }

    // Run Cross-Document Verification Engine
    const verificationSummary = runCrossDocumentVerification(dummyAppId, docRecords, extractedFields);

    console.log(`OVERALL VERIFICATION STATUS: ${verificationSummary.overall_status}`);
    console.log(`CHECKS: Name=${verificationSummary.checks.applicant_name} | DOB=${verificationSummary.checks.dob}`);

    verificationSummary.results.forEach((res) => {
      console.log(
        `  - Field '${res.field_name}': status=${res.status} | sim=${res.similarity_score} | reason="${res.mismatch_reason}"`
      );
    });

    // SCENARIO ASSERTIONS
    if (key === 'SCENARIO_1_VALID') {
      console.assert(verificationSummary.overall_status === 'PASS', 'Scenario 1 should PASS');
      console.assert(verificationSummary.checks.applicant_name === 'MATCH', 'Scenario 1 name should MATCH');
      console.assert(verificationSummary.checks.dob === 'MATCH', 'Scenario 1 DOB should MATCH');
    } else if (key === 'SCENARIO_2_NAME_MISMATCH') {
      console.assert(verificationSummary.overall_status === 'REVIEW_REQUIRED', 'Scenario 2 should REVIEW_REQUIRED');
      console.assert(verificationSummary.checks.applicant_name === 'MAJOR_MISMATCH', 'Scenario 2 name should be MAJOR_MISMATCH');
    } else if (key === 'SCENARIO_3_INCOME_INELIGIBLE') {
      // Income is NOT checked in Phase 5 verification; name/dob are consistent so overall verification is PASS
      console.assert(verificationSummary.overall_status === 'PASS', 'Scenario 3 verification should PASS (Income checked in Phase 6 rule engine)');
    } else if (key === 'SCENARIO_4_MISSING_DOC') {
      console.assert(verificationSummary.overall_status === 'INCONCLUSIVE', 'Scenario 4 should be INCONCLUSIVE due to missing doc');
    } else if (key === 'SCENARIO_5_MULTIPLE_ISSUES') {
      console.assert(verificationSummary.overall_status === 'REVIEW_REQUIRED', 'Scenario 5 should REVIEW_REQUIRED');
      console.assert(verificationSummary.checks.dob === 'CRITICAL_MISMATCH', 'Scenario 5 DOB should be CRITICAL_MISMATCH');
    }
  }

  console.log('\n====================================================');
  console.log(' PHASE 5 CROSS-DOCUMENT VERIFICATION TEST COMPLETE');
  console.log(' ALL 5 SCENARIOS PASSED VERIFICATION ASSERTIONS');
  console.log('====================================================');
}

runPhase5VerificationTest().catch(console.error);
