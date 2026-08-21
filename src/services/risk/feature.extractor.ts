import { Application } from '@/types/application.types';
import { DocumentRecord, ExtractedField } from '@/types/document.types';
import { FieldVerificationResult } from '@/types/verification.types';
import { RuleResult } from '@/types/rule.types';
import { ApplicationException } from '@/types/exception.types';
import { RiskFeatures } from '@/types/risk.types';

export class FeatureExtractor {
  static extractFeatures(params: {
    application: Application;
    documents: DocumentRecord[];
    extractedFields: ExtractedField[];
    verificationResults: FieldVerificationResult[];
    ruleResults: RuleResult[];
    exceptions: ApplicationException[];
  }): RiskFeatures {
    const {
      documents,
      extractedFields,
      verificationResults,
      ruleResults,
      exceptions,
    } = params;

    const documentCount = documents.length;
    const missingDocumentCount = Math.max(0, 4 - documentCount);
    const documentCompleteness = Math.min(1.0, documentCount / 4.0);

    // OCR Confidence
    let totalOcrConf = 0;
    documents.forEach((d) => {
      totalOcrConf += d.ocr_confidence ?? 0.95;
    });
    const averageOcrConfidence = documentCount > 0 ? totalOcrConf / documentCount : 0.0;

    // Field Extraction Confidence
    let totalExtConf = 0;
    let minExtConf = 1.0;
    if (extractedFields.length > 0) {
      extractedFields.forEach((f) => {
        const conf = f.confidence ?? 0.95;
        totalExtConf += conf;
        if (conf < minExtConf) minExtConf = conf;
      });
    } else {
      minExtConf = 0.0;
    }
    const averageExtractionConfidence =
      extractedFields.length > 0 ? totalExtConf / extractedFields.length : 0.0;

    // Verification Checks
    const nameVer = verificationResults.find((r) => r.field_name === 'applicant_name');
    const dobVer = verificationResults.find((r) => r.field_name === 'dob');

    const nameSimilarity = nameVer?.similarity_score ?? 1.0;
    const dobConsistency = dobVer ? (dobVer.status === 'MATCH' ? 1.0 : 0.0) : 1.0;

    const verificationMismatchCount = verificationResults.filter(
      (r) => r.status !== 'MATCH'
    ).length;

    // Exceptions
    const criticalExceptionCount = exceptions.filter(
      (e) => e.severity === 'CRITICAL' || e.severity === 'MAJOR'
    ).length;
    const warningExceptionCount = exceptions.filter(
      (e) => e.severity === 'WARNING' || e.severity === 'INFO'
    ).length;

    // Eligibility Rules
    const eligibilityRuleFailureCount = ruleResults.filter((r) => r.status === 'FAIL').length;

    // Income Threshold Distance Calculation
    const incomeField = extractedFields.find((f) => f.field_name === 'annual_income');
    let annualIncome = 0;
    if (incomeField && incomeField.normalized_value) {
      annualIncome = typeof incomeField.normalized_value === 'number'
        ? incomeField.normalized_value
        : parseFloat(String(incomeField.normalized_value).replace(/[^0-9.]/g, '')) || 0;
    }

    const thresholdLimit = 250000;
    const incomeDistanceFromThreshold =
      annualIncome > 0 ? (annualIncome - thresholdLimit) / thresholdLimit : 0.0;

    return {
      document_count: documentCount,
      missing_document_count: missingDocumentCount,
      average_ocr_confidence: averageOcrConfidence,
      average_extraction_confidence: averageExtractionConfidence,
      minimum_extraction_confidence: minExtConf,
      name_similarity: nameSimilarity,
      dob_consistency: dobConsistency,
      verification_mismatch_count: verificationMismatchCount,
      critical_exception_count: criticalExceptionCount,
      warning_exception_count: warningExceptionCount,
      eligibility_rule_failure_count: eligibilityRuleFailureCount,
      income_distance_from_threshold: incomeDistanceFromThreshold,
      document_completeness: documentCompleteness,
    };
  }
}
