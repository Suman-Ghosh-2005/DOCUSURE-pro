import { NextRequest, NextResponse } from 'next/server';
import { ApplicationRepository } from '@/repositories/application.repository';
import { DocumentRepository } from '@/repositories/document.repository';
import { ExtractedFieldRepository } from '@/repositories/extracted-field.repository';
import { VerificationRepository } from '@/repositories/verification.repository';
import { RuleRepository } from '@/repositories/rule.repository';
import { ExceptionRepository } from '@/repositories/exception.repository';
import { evaluateEligibility } from '@/services/rules/eligibility.engine';
import { DEFAULT_SCHEME_RULES, DEFAULT_SCHEME_ID } from '@/lib/constants/default-rules';
import { RuleDefinition } from '@/types/rule.types';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await context.params;
    const application = await ApplicationRepository.getById(applicationId);

    if (!application) {
      return NextResponse.json(
        { data: null, error: { message: 'Application not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    const schemeId = application.scheme_id || DEFAULT_SCHEME_ID;
    const activeSchemeRuleRecord = await RuleRepository.getActiveSchemeRules(schemeId);
    let rulesToEvaluate: RuleDefinition[] = DEFAULT_SCHEME_RULES;

    if (activeSchemeRuleRecord && activeSchemeRuleRecord.rules_json?.rules) {
      rulesToEvaluate = activeSchemeRuleRecord.rules_json.rules;
    }

    const documents = await DocumentRepository.getByApplicationId(applicationId);
    const extractedFields = await ExtractedFieldRepository.getByApplicationId(applicationId);
    const verificationResults = await VerificationRepository.getByApplicationId(applicationId);

    await RuleRepository.deleteRuleResultsByApplicationId(applicationId);
    await ExceptionRepository.deleteByApplicationId(applicationId);

    const evaluation = evaluateEligibility({
      application,
      documents,
      extractedFields,
      verificationResults,
      rules: rulesToEvaluate,
    });

    if (evaluation.rule_results.length > 0) {
      await RuleRepository.saveRuleResults(evaluation.rule_results);
    }

    if (evaluation.generated_exceptions.length > 0) {
      await ExceptionRepository.createBatch(evaluation.generated_exceptions);
    }

    let appStatus: 'VERIFIED' | 'INELIGIBLE' | 'EXCEPTION' = 'VERIFIED';
    if (evaluation.overall_status === 'INELIGIBLE') {
      appStatus = 'INELIGIBLE';
    } else if (evaluation.overall_status === 'REVIEW_REQUIRED') {
      appStatus = 'EXCEPTION';
    }

    const routingReason =
      evaluation.overall_status === 'ELIGIBLE'
        ? 'All eligibility rules passed successfully. Ready for approval.'
        : evaluation.overall_status === 'INELIGIBLE'
        ? `Failed ${evaluation.blocking_failures.length} blocking rule(s). Application ineligible.`
        : 'Requires officer review due to identity mismatch or missing evidence.';

    await ApplicationRepository.updateStatus(
      applicationId,
      appStatus,
      routingReason,
      'Eligibility Evaluation Complete'
    );

    return NextResponse.json({
      data: {
        applicationId,
        overallStatus: evaluation.overall_status,
        eligible: evaluation.eligible,
        ruleResults: evaluation.rule_results,
        blockingFailures: evaluation.blocking_failures,
        inconclusiveRules: evaluation.inconclusive_rules,
        exceptions: evaluation.generated_exceptions,
      },
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Eligibility evaluation error';
    console.error('[Eligibility Route Error]:', error);
    return NextResponse.json(
      { data: null, error: { message, code: 'ELIGIBILITY_PIPELINE_ERROR' } },
      { status: 500 }
    );
  }
}
