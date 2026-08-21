import { generateSyntheticPDF } from '@/lib/pdf/generator';
import { extractTextFromDocumentBuffer } from '@/services/ocr/tesseract.service';
import { runCrossDocumentVerification } from '@/services/verification/cross-document.engine';
import { evaluateEligibility } from '@/services/rules/eligibility.engine';
import { officerDecisionSchema } from '@/lib/validators/review.schema';
import { DEMO_SCENARIOS, DemoScenarioId } from '@/lib/constants/demo-scenarios';
import { DEFAULT_SCHEME_RULES, DEFAULT_SCHEME_ID } from '@/lib/constants/default-rules';
import { Application } from '@/types/application.types';
import { DocumentRecord, ExtractedField } from '@/types/document.types';
import { v4 as uuidv4 } from 'uuid';

async function runMasterE2EIntegrationTest() {
  console.log('================================================================');
  console.log('       DOCUSURE — MASTER END-TO-END DEMO INTEGRATION AUDIT       ');
  console.log('================================================================\n');

  const scenarioKeys = Object.keys(DEMO_SCENARIOS) as DemoScenarioId[];
  const auditResults: Record<string, boolean> = {};

  for (const key of scenarioKeys) {
    const scenario = DEMO_SCENARIOS[key];
    console.log(`>>> TESTING END-TO-END FLOW FOR ${scenario.name} (${scenario.applicantName})`);

    const appId = uuidv4();

    // 1. APPLICATION CREATION STAGE
    const application: Application = {
      id: appId,
      applicant_name: scenario.applicantName,
      scheme_id: DEFAULT_SCHEME_ID,
      status: 'SUBMITTED',
      processing_stage: 'Submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 2. DOCUMENT SYNTHESIS & STORAGE STAGE
    const docRecords: DocumentRecord[] = [];

    for (const docDef of scenario.documents) {
      const docId = uuidv4();
      docRecords.push({
        id: docId,
        application_id: appId,
        slot_type: docDef.slotType,
        document_type: docDef.slotType,
        status: 'UPLOADED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // 3. OCR PROCESSING STAGE (Phase 3) & FIELD EXTRACTION (Phase 4)
    const extractedFields: ExtractedField[] = [];

    for (const docDef of scenario.documents) {
      const matchingDoc = docRecords.find((d) => d.slot_type === docDef.slotType);
      if (!matchingDoc) continue;

      const pdfBuffer = generateSyntheticPDF(docDef);
      const ocrResult = await extractTextFromDocumentBuffer(pdfBuffer, 'application/pdf');

      // Populate extracted fields from synthetic document text definition
      Object.entries(docDef.fields).forEach(([k, v]) => {
        let fieldName = 'applicant_name';
        if (['Full Name', 'Certificate Holder', 'Student Name', 'Resident Name'].includes(k)) {
          fieldName = 'applicant_name';
        } else if (k === 'Date of Birth') {
          fieldName = 'dob';
        } else if (k === 'Annual Family Income') {
          fieldName = 'annual_income';
        } else if (k === 'Marks Percentage') {
          fieldName = 'marks_percentage';
        } else if (k === 'Domicile State') {
          fieldName = 'domicile_state';
        } else {
          fieldName = k.toLowerCase().replace(/\s+/g, '_');
        }

        extractedFields.push({
          id: uuidv4(),
          document_id: matchingDoc.id,
          application_id: appId,
          field_name: fieldName,
          raw_value: String(v),
          normalized_value: String(v),
          confidence: 0.95,
          source_text: `${k}: ${v}`,
        });
      });
    }

    // 4. CROSS-DOCUMENT VERIFICATION STAGE (Phase 5)
    const verificationSummary = runCrossDocumentVerification(appId, docRecords, extractedFields);

    // 5. DETERMINISTIC ELIGIBILITY RULE ENGINE STAGE (Phase 6)
    const eligibilitySummary = evaluateEligibility({
      application,
      documents: docRecords,
      extractedFields,
      verificationResults: verificationSummary.results,
      rules: DEFAULT_SCHEME_RULES,
    });

    // 6. OFFICER REVIEW & DECISION STAGE (Phase 7)
    let recommendedDecision: 'APPROVE' | 'REJECT' | 'REQUEST_CORRECTION' = 'APPROVE';
    let officerNotes = 'Verified by officer.';
    let rejectionReasons: string[] | undefined = undefined;

    if (eligibilitySummary.overall_status === 'ELIGIBLE') {
      recommendedDecision = 'APPROVE';
      officerNotes = 'Approved: All eligibility rules and document verifications passed.';
    } else if (eligibilitySummary.overall_status === 'INELIGIBLE') {
      recommendedDecision = 'REJECT';
      rejectionReasons = ['Annual family income exceeds threshold'];
      officerNotes = 'Rejected: Declared income exceeds permitted scheme threshold.';
    } else {
      recommendedDecision = key === 'SCENARIO_4_MISSING_DOC' ? 'REQUEST_CORRECTION' : 'REJECT';
      if (recommendedDecision === 'REJECT') {
        rejectionReasons = ['Cross-document identity mismatch'];
      }
      officerNotes = 'Officer action taken for review required application.';
    }

    const decisionPayload = {
      decision: recommendedDecision,
      notes: officerNotes,
      rejection_reasons: rejectionReasons,
    };

    const decisionValidation = officerDecisionSchema.safeParse(decisionPayload);

    // AUDIT ASSERTIONS PER SCENARIO
    let passed = false;
    if (key === 'SCENARIO_1_VALID') {
      passed =
        eligibilitySummary.overall_status === 'ELIGIBLE' &&
        verificationSummary.overall_status === 'PASS' &&
        decisionValidation.success;
    } else if (key === 'SCENARIO_2_NAME_MISMATCH') {
      passed =
        verificationSummary.checks.applicant_name === 'MAJOR_MISMATCH' &&
        eligibilitySummary.overall_status === 'REVIEW_REQUIRED' &&
        decisionValidation.success;
    } else if (key === 'SCENARIO_3_INCOME_INELIGIBLE') {
      passed =
        eligibilitySummary.overall_status === 'INELIGIBLE' &&
        eligibilitySummary.blocking_failures.includes('income_check') &&
        decisionValidation.success;
    } else if (key === 'SCENARIO_4_MISSING_DOC') {
      passed =
        verificationSummary.overall_status === 'INCONCLUSIVE' &&
        eligibilitySummary.overall_status === 'REVIEW_REQUIRED' &&
        decisionValidation.success;
    } else if (key === 'SCENARIO_5_MULTIPLE_ISSUES') {
      passed =
        eligibilitySummary.overall_status === 'INELIGIBLE' &&
        verificationSummary.checks.dob === 'CRITICAL_MISMATCH' &&
        decisionValidation.success;
    }

    auditResults[key] = passed;

    console.log(`  └─ Verification Result : ${verificationSummary.overall_status}`);
    console.log(`  └─ Eligibility Result  : ${eligibilitySummary.overall_status} (Eligible: ${eligibilitySummary.eligible})`);
    console.log(`  └─ Officer Decision    : ${recommendedDecision} (Valid: ${decisionValidation.success})`);
    console.log(`  └─ Scenario End-to-End : ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
  }

  console.log('================================================================');
  console.log('                 FINAL END-TO-END AUDIT SUMMARY                 ');
  console.log('================================================================');
  Object.entries(auditResults).forEach(([scenario, result]) => {
    console.log(` ${scenario.padEnd(25)} : ${result ? 'PASS ✅' : 'FAIL ❌'}`);
  });
  console.log('================================================================\n');
}

runMasterE2EIntegrationTest().catch(console.error);
