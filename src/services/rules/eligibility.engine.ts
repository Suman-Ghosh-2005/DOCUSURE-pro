import { Application } from '@/types/application.types';
import { ExtractedField, DocumentRecord } from '@/types/document.types';
import { FieldVerificationResult } from '@/types/verification.types';
import { RuleDefinition, RuleResult, RuleEvaluationStatus } from '@/types/rule.types';
import { ApplicationException } from '@/types/exception.types';
import { DEFAULT_SCHEME_RULES } from '@/lib/constants/default-rules';

export interface EligibilityEvaluationOptions {
  application: Application;
  documents: DocumentRecord[];
  extractedFields: ExtractedField[];
  verificationResults: FieldVerificationResult[];
  rules?: RuleDefinition[];
}

export interface EligibilityEngineSummary {
  application_id: string;
  overall_status: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_REQUIRED';
  eligible: boolean;
  rule_results: Omit<RuleResult, 'id' | 'created_at'>[];
  blocking_failures: string[];
  inconclusive_rules: string[];
  generated_exceptions: Omit<ApplicationException, 'id' | 'created_at'>[];
}

/**
 * Phase 6 — Deterministic Scheme Eligibility Rule Engine
 * Evaluates scholarship rules deterministically without any LLM dependency.
 */
export function evaluateEligibility({
  application,
  documents,
  extractedFields,
  verificationResults,
  rules = DEFAULT_SCHEME_RULES,
}: EligibilityEvaluationOptions): EligibilityEngineSummary {
  const ruleResults: Omit<RuleResult, 'id' | 'created_at'>[] = [];
  const generatedExceptions: Omit<ApplicationException, 'id' | 'created_at'>[] = [];
  const blockingFailures: string[] = [];
  const inconclusiveRules: string[] = [];

  // Map extracted fields by canonical field name
  const fieldsMap = new Map<string, string>();
  extractedFields.forEach((f) => {
    const val = f.normalized_value || f.raw_value;
    if (val && !fieldsMap.has(f.field_name)) {
      fieldsMap.set(f.field_name, String(val));
    }
  });

  // Check Phase 5 verification status for identity fields
  const nameVerification = verificationResults.find((v) => v.field_name === 'applicant_name');
  const dobVerification = verificationResults.find((v) => v.field_name === 'dob');

  const hasCriticalIdentityMismatch =
    nameVerification?.status === 'MAJOR_MISMATCH' ||
    nameVerification?.status === 'CRITICAL_MISMATCH' ||
    dobVerification?.status === 'CRITICAL_MISMATCH' ||
    dobVerification?.status === 'MAJOR_MISMATCH';

  // Log identity exceptions if Phase 5 flagged mismatches
  if (nameVerification && (nameVerification.status === 'MAJOR_MISMATCH' || nameVerification.status === 'MINOR_MISMATCH')) {
    generatedExceptions.push({
      application_id: application.id,
      type: 'NAME_MISMATCH',
      severity: nameVerification.status === 'MAJOR_MISMATCH' ? 'CRITICAL' : 'WARNING',
      is_blocking: nameVerification.status === 'MAJOR_MISMATCH',
      field_name: 'applicant_name',
      description: nameVerification.mismatch_reason || 'Name mismatch across documents.',
      recommended_action: 'Inspect submitted identity documents and mark statements for name variations.',
    });
  }

  if (dobVerification && dobVerification.status === 'CRITICAL_MISMATCH') {
    generatedExceptions.push({
      application_id: application.id,
      type: 'DOB_MISMATCH',
      severity: 'CRITICAL',
      is_blocking: true,
      field_name: 'dob',
      description: dobVerification.mismatch_reason || 'Date of birth mismatch across documents.',
      recommended_action: 'Verify applicant date of birth on identity proof vs academic marksheet.',
    });
  }

  // Evaluate each rule in active scheme rules
  for (const ruleDef of rules) {
    if (ruleDef.condition.type !== 'LEAF') {
      continue;
    }

    const { field, operator, value: thresholdVal } = ruleDef.condition;
    const extractedVal = fieldsMap.get(field);

    let status: RuleEvaluationStatus = 'PASS';
    let reason = '';
    let evaluatedFormattedVal: string | null = null;
    let thresholdFormattedVal: string | null = null;

    if (field === 'annual_income') {
      thresholdFormattedVal = `₹${Number(thresholdVal).toLocaleString('en-IN')}`;
      if (!extractedVal) {
        status = 'INCONCLUSIVE';
        reason = 'Income certificate or annual family income value is missing.';
        evaluatedFormattedVal = 'Missing';
      } else {
        const incomeNum = parseFloat(extractedVal.replace(/[^0-9.]/g, ''));
        if (isNaN(incomeNum)) {
          status = 'INCONCLUSIVE';
          reason = `Unparseable annual income value (${extractedVal}).`;
          evaluatedFormattedVal = extractedVal;
        } else {
          evaluatedFormattedVal = `₹${incomeNum.toLocaleString('en-IN')}`;
          if (incomeNum <= Number(thresholdVal)) {
            status = 'PASS';
            reason = `Annual family income of ${evaluatedFormattedVal} satisfies the maximum threshold of ${thresholdFormattedVal}.`;
          } else {
            status = 'FAIL';
            reason = `Declared annual family income of ${evaluatedFormattedVal} exceeds the maximum permitted threshold of ${thresholdFormattedVal}.`;
          }
        }
      }
    } else if (field === 'marks_percentage') {
      thresholdFormattedVal = `${thresholdVal}%`;
      if (!extractedVal) {
        status = 'INCONCLUSIVE';
        reason = 'Academic marksheet or marks percentage value is missing.';
        evaluatedFormattedVal = 'Missing';
      } else {
        const marksNum = parseFloat(extractedVal.replace(/[^0-9.]/g, ''));
        if (isNaN(marksNum)) {
          status = 'INCONCLUSIVE';
          reason = `Unparseable marks percentage value (${extractedVal}).`;
          evaluatedFormattedVal = extractedVal;
        } else {
          evaluatedFormattedVal = `${marksNum}%`;
          if (marksNum >= Number(thresholdVal)) {
            status = 'PASS';
            reason = `Academic marks percentage of ${evaluatedFormattedVal} satisfies the minimum threshold of ${thresholdFormattedVal}.`;
          } else {
            status = 'FAIL';
            reason = `Academic marks percentage of ${evaluatedFormattedVal} is below the required minimum threshold of ${thresholdFormattedVal}.`;
          }
        }
      }
    } else if (field === 'domicile_state') {
      thresholdFormattedVal = String(thresholdVal);
      if (!extractedVal) {
        status = 'INCONCLUSIVE';
        reason = 'Domicile certificate or state domicile value is missing.';
        evaluatedFormattedVal = 'Missing';
      } else {
        evaluatedFormattedVal = extractedVal;
        if (extractedVal.toUpperCase() === String(thresholdVal).toUpperCase()) {
          status = 'PASS';
          reason = `Applicant domicile state (${extractedVal}) satisfies state requirement.`;
        } else {
          status = 'FAIL';
          reason = `Applicant domicile state (${extractedVal}) does not match required state (${thresholdFormattedVal}).`;
        }
      }
    } else {
      thresholdFormattedVal = String(thresholdVal);
      evaluatedFormattedVal = extractedVal || 'Missing';
      if (!extractedVal) {
        status = 'INCONCLUSIVE';
        reason = `Extracted value for ${ruleDef.name} is missing.`;
      } else if (String(extractedVal).toLowerCase() === String(thresholdVal).toLowerCase()) {
        status = 'PASS';
        reason = `${ruleDef.name} requirement satisfied.`;
      } else {
        status = 'FAIL';
        reason = `${ruleDef.name} requirement failed.`;
      }
    }

    // Handle Unreliable Evidence due to Identity Mismatches
    if (status === 'PASS' && hasCriticalIdentityMismatch) {
      status = 'INCONCLUSIVE';
      reason = `${reason} (Notice: Eligibility could not be conclusively determined because applicant identity information contains a cross-document mismatch).`;
    }

    if (status === 'FAIL' && ruleDef.is_blocking) {
      blockingFailures.push(ruleDef.id);
      generatedExceptions.push({
        application_id: application.id,
        type: 'RULE_FAIL',
        severity: 'CRITICAL',
        is_blocking: true,
        field_name: field,
        description: reason,
        recommended_action: `Review submitted document for ${ruleDef.name} or reject application.`,
      });
    }

    if (status === 'INCONCLUSIVE' && ruleDef.is_blocking) {
      inconclusiveRules.push(ruleDef.id);
      generatedExceptions.push({
        application_id: application.id,
        type: 'FIELD_MISSING',
        severity: 'WARNING',
        is_blocking: true,
        field_name: field,
        description: reason,
        recommended_action: `Request missing document or correction for ${ruleDef.name}.`,
      });
    }

    ruleResults.push({
      application_id: application.id,
      rule_id: ruleDef.id,
      rule_name: ruleDef.name,
      status,
      evaluated_value: evaluatedFormattedVal,
      threshold: thresholdFormattedVal,
      operator,
      reason,
      is_blocking: ruleDef.is_blocking,
    });
  }

  // Determine Overall Eligibility Status
  let overallStatus: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_REQUIRED' = 'ELIGIBLE';
  let eligible = false;

  if (blockingFailures.length > 0) {
    overallStatus = 'INELIGIBLE';
    eligible = false;
  } else if (
    inconclusiveRules.length > 0 ||
    hasCriticalIdentityMismatch ||
    documents.length < 4 ||
    nameVerification?.status === 'MINOR_MISMATCH'
  ) {
    overallStatus = 'REVIEW_REQUIRED';
    eligible = false;
  } else {
    overallStatus = 'ELIGIBLE';
    eligible = true;
  }

  return {
    application_id: application.id,
    overall_status: overallStatus,
    eligible,
    rule_results: ruleResults,
    blocking_failures: blockingFailures,
    inconclusive_rules: inconclusiveRules,
    generated_exceptions: generatedExceptions,
  };
}
