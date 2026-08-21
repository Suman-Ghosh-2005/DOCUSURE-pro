import { RiskFeatures, RiskPredictionResult, RiskLevel } from '@/types/risk.types';

export class RiskEngine {
  /**
   * ML Anomaly & Risk Prediction Engine
   * Calculates explainable risk score (0-100), risk level (LOW/MEDIUM/HIGH),
   * and contributing risk signals from feature vector snapshot.
   */
  static predict(features: RiskFeatures): RiskPredictionResult {
    let rawScore = 0;
    const signals: string[] = [];

    // 1. DOB Consistency Check (Weight: 30)
    if (features.dob_consistency === 0.0) {
      rawScore += 30;
      signals.push('Date of birth mismatch detected across submitted documents');
    }

    // 2. Name Similarity Check (Weight: 25)
    if (features.name_similarity < 0.85) {
      const penalty = Math.round((1 - features.name_similarity) * 35);
      rawScore += Math.max(15, penalty);
      signals.push(`Applicant name similarity (${(features.name_similarity * 100).toFixed(0)}%) below 85% threshold`);
    }

    // 3. Income Threshold Distance Check (Weight: 25)
    if (features.income_distance_from_threshold > 0) {
      rawScore += 25;
      signals.push('Declared annual income exceeds scheme eligibility limit');
    }

    // 4. Missing Document Check (Weight: 15 per missing doc)
    if (features.missing_document_count > 0) {
      rawScore += features.missing_document_count * 15;
      signals.push(`Missing ${features.missing_document_count} required document slot(s)`);
    }

    // 5. Verification Mismatches (Weight: 10 per mismatch)
    if (features.verification_mismatch_count > 0) {
      rawScore += features.verification_mismatch_count * 10;
      signals.push(`Detected ${features.verification_mismatch_count} cross-document verification mismatch(es)`);
    }

    // 6. Eligibility Rule Failures (Weight: 15)
    if (features.eligibility_rule_failure_count > 0) {
      rawScore += features.eligibility_rule_failure_count * 15;
      signals.push(`Failed ${features.eligibility_rule_failure_count} scheme eligibility rule(s)`);
    }

    // 7. Critical Exceptions (Weight: 15)
    if (features.critical_exception_count > 0) {
      rawScore += features.critical_exception_count * 15;
      signals.push(`Found ${features.critical_exception_count} critical/major system exception(s)`);
    }

    // 8. OCR / Extraction Confidence Uncertainty (Weight: 10)
    if (features.average_ocr_confidence < 0.75 || features.minimum_extraction_confidence < 0.65) {
      rawScore += 12;
      signals.push('High OCR or field extraction uncertainty detected');
    }

    // Clamp score between 0 and 100
    const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Categorize Risk Level
    let riskLevel: RiskLevel = 'LOW';
    if (finalScore >= 70) {
      riskLevel = 'HIGH';
    } else if (finalScore >= 35) {
      riskLevel = 'MEDIUM';
    }

    if (signals.length === 0) {
      signals.push('No anomalous risk signals detected. Application features within normal parameters.');
    }

    return {
      risk_score: finalScore,
      risk_level: riskLevel,
      contributing_signals: signals,
      feature_snapshot: features,
      model_name: 'ExplainableRiskScoring_v1',
      model_version: '1.0.0',
    };
  }
}
