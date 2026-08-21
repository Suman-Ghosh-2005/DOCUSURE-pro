import { ExtractedField, DocumentRecord } from '@/types/document.types';
import { FieldVerificationResult, VerificationMatchStatus } from '@/types/verification.types';
import { normalizeName, normalizeDate, calculateTokenSortSimilarity } from './normalizer';

export interface VerificationEngineSummary {
  application_id: string;
  overall_status: 'PASS' | 'REVIEW_REQUIRED' | 'INCONCLUSIVE';
  checks: {
    applicant_name: VerificationMatchStatus;
    dob: VerificationMatchStatus;
  };
  results: FieldVerificationResult[];
}

/**
 * Phase 5 — Deterministic Cross-Document Verification Engine
 * Compares normalized extracted fields across documents belonging to the same application.
 * Zero LLM dependency.
 */
export function runCrossDocumentVerification(
  applicationId: string,
  documents: DocumentRecord[],
  extractedFields: ExtractedField[]
): VerificationEngineSummary {
  const docMap = new Map<string, DocumentRecord>();
  documents.forEach((d) => docMap.set(d.id, d));

  // Group extracted fields by standardized field_name
  const fieldsByName = new Map<string, ExtractedField[]>();
  extractedFields.forEach((field) => {
    const canonicalName = mapCanonicalFieldName(field.field_name);
    if (!fieldsByName.has(canonicalName)) {
      fieldsByName.set(canonicalName, []);
    }
    fieldsByName.get(canonicalName)!.push(field);
  });

  const verificationResults: FieldVerificationResult[] = [];

  // VERIFY APPLICANT NAME
  const nameResult = verifyApplicantName(applicationId, fieldsByName.get('applicant_name') || [], docMap);
  verificationResults.push(nameResult);

  // VERIFY DATE OF BIRTH (DOB)
  const dobResult = verifyDateOfBirth(applicationId, fieldsByName.get('dob') || [], docMap);
  verificationResults.push(dobResult);

  const nameStatus = nameResult.status;
  const dobStatus = dobResult.status;

  let overallStatus: 'PASS' | 'REVIEW_REQUIRED' | 'INCONCLUSIVE' = 'PASS';

  if (
    nameStatus === 'MAJOR_MISMATCH' ||
    nameStatus === 'CRITICAL_MISMATCH' ||
    nameStatus === 'MINOR_MISMATCH' ||
    dobStatus === 'CRITICAL_MISMATCH' ||
    dobStatus === 'MAJOR_MISMATCH' ||
    dobStatus === 'MINOR_MISMATCH'
  ) {
    overallStatus = 'REVIEW_REQUIRED';
  } else if (
    documents.length < 4 ||
    nameStatus === 'MISSING' ||
    dobStatus === 'MISSING' ||
    nameStatus === 'SINGLE_SOURCE'
  ) {
    // Missing required document slot or missing evidence forces INCONCLUSIVE verification status
    overallStatus = 'INCONCLUSIVE';
  }

  return {
    application_id: applicationId,
    overall_status: overallStatus,
    checks: {
      applicant_name: nameStatus,
      dob: dobStatus,
    },
    results: verificationResults,
  };
}

/**
 * Map aliases to canonical field names
 */
function mapCanonicalFieldName(rawName: string): string {
  if (['applicant_name', 'student_name', 'holder_name', 'resident_name'].includes(rawName)) {
    return 'applicant_name';
  }
  if (['dob', 'date_of_birth'].includes(rawName)) {
    return 'dob';
  }
  return rawName;
}

/**
 * Deterministic Name Verification
 */
function verifyApplicantName(
  applicationId: string,
  nameFields: ExtractedField[],
  docMap: Map<string, DocumentRecord>
): FieldVerificationResult {
  const valuesFound: Record<string, string> = {};
  const docIdsCompared: string[] = [];
  const normalizedValuesMap: Record<string, string> = {};

  nameFields.forEach((f) => {
    const doc = docMap.get(f.document_id);
    const slot = doc?.slot_type || 'UNKNOWN';
    if (f.normalized_value || f.raw_value) {
      const norm = normalizeName(String(f.normalized_value || f.raw_value));
      if (norm) {
        valuesFound[slot] = String(f.raw_value || f.normalized_value);
        normalizedValuesMap[slot] = norm;
        if (f.document_id && !docIdsCompared.includes(f.document_id)) {
          docIdsCompared.push(f.document_id);
        }
      }
    }
  });

  const slotsPresent = Object.keys(normalizedValuesMap);

  if (slotsPresent.length === 0) {
    return {
      application_id: applicationId,
      field_name: 'applicant_name',
      status: 'MISSING',
      similarity_score: 0.0,
      mismatch_reason: 'No applicant name extracted from any document slot.',
      values_found: transformValuesFoundForStorage(valuesFound, normalizedValuesMap),
      documents_compared: docIdsCompared,
    };
  }

  if (slotsPresent.length === 1) {
    return {
      application_id: applicationId,
      field_name: 'applicant_name',
      status: 'SINGLE_SOURCE',
      similarity_score: 1.0,
      mismatch_reason: `Applicant name extracted from only 1 document (${slotsPresent[0]}). Cross-document comparison unavailable.`,
      values_found: transformValuesFoundForStorage(valuesFound, normalizedValuesMap),
      documents_compared: docIdsCompared,
    };
  }

  // Compare all slot pairs
  let minSimilarity = 1.0;
  let mismatchPairText = '';

  for (let i = 0; i < slotsPresent.length; i++) {
    for (let j = i + 1; j < slotsPresent.length; j++) {
      const slotA = slotsPresent[i];
      const slotB = slotsPresent[j];
      const nameA = normalizedValuesMap[slotA];
      const nameB = normalizedValuesMap[slotB];

      const sim = calculateTokenSortSimilarity(nameA, nameB);
      if (sim < minSimilarity) {
        minSimilarity = sim;
        mismatchPairText = `${slotA} ("${nameA}") vs ${slotB} ("${nameB}")`;
      }
    }
  }

  let status: VerificationMatchStatus = 'MATCH';
  let reason = 'Applicant name is consistent across all submitted documents.';

  if (minSimilarity >= 0.95) {
    status = 'MATCH';
  } else if (minSimilarity >= 0.85) {
    status = 'MINOR_MISMATCH';
    reason = `Minor name variation detected: ${mismatchPairText} (Similarity: ${(minSimilarity * 100).toFixed(1)}%). Requires officer review.`;
  } else {
    status = 'MAJOR_MISMATCH';
    reason = `Major name mismatch detected: ${mismatchPairText} (Similarity: ${(minSimilarity * 100).toFixed(1)}%). Requires officer review.`;
  }

  return {
    application_id: applicationId,
    field_name: 'applicant_name',
    status,
    similarity_score: minSimilarity,
    mismatch_reason: reason,
    values_found: transformValuesFoundForStorage(valuesFound, normalizedValuesMap),
    documents_compared: docIdsCompared,
  };
}

/**
 * Deterministic Date of Birth (DOB) Verification
 */
function verifyDateOfBirth(
  applicationId: string,
  dobFields: ExtractedField[],
  docMap: Map<string, DocumentRecord>
): FieldVerificationResult {
  const valuesFound: Record<string, string> = {};
  const docIdsCompared: string[] = [];
  const normalizedDatesMap: Record<string, string> = {};

  dobFields.forEach((f) => {
    const doc = docMap.get(f.document_id);
    const slot = doc?.slot_type || 'UNKNOWN';
    if (f.normalized_value || f.raw_value) {
      const normDate = normalizeDate(String(f.normalized_value || f.raw_value));
      if (normDate) {
        valuesFound[slot] = String(f.raw_value || f.normalized_value);
        normalizedDatesMap[slot] = normDate;
        if (f.document_id && !docIdsCompared.includes(f.document_id)) {
          docIdsCompared.push(f.document_id);
        }
      }
    }
  });

  const slotsPresent = Object.keys(normalizedDatesMap);

  if (slotsPresent.length === 0) {
    return {
      application_id: applicationId,
      field_name: 'dob',
      status: 'MISSING',
      similarity_score: 0.0,
      mismatch_reason: 'No date of birth extracted from any document slot.',
      values_found: transformValuesFoundForStorage(valuesFound, normalizedDatesMap),
      documents_compared: docIdsCompared,
    };
  }

  if (slotsPresent.length === 1) {
    return {
      application_id: applicationId,
      field_name: 'dob',
      status: 'SINGLE_SOURCE',
      similarity_score: 1.0,
      mismatch_reason: `DOB extracted from only 1 document (${slotsPresent[0]}). Cross-document comparison unavailable.`,
      values_found: transformValuesFoundForStorage(valuesFound, normalizedDatesMap),
      documents_compared: docIdsCompared,
    };
  }

  // Exact ISO Date Equality Check across all slots
  const firstDate = normalizedDatesMap[slotsPresent[0]];
  const hasMismatch = slotsPresent.some((slot) => normalizedDatesMap[slot] !== firstDate);

  if (hasMismatch) {
    const mismatchDetails = slotsPresent
      .map((s) => `${s}: ${normalizedDatesMap[s]}`)
      .join(', ');

    return {
      application_id: applicationId,
      field_name: 'dob',
      status: 'CRITICAL_MISMATCH',
      similarity_score: 0.0,
      mismatch_reason: `Date of birth mismatch across documents (${mismatchDetails}). Requires officer review.`,
      values_found: transformValuesFoundForStorage(valuesFound, normalizedDatesMap),
      documents_compared: docIdsCompared,
    };
  }

  return {
    application_id: applicationId,
    field_name: 'dob',
    status: 'MATCH',
    similarity_score: 1.0,
    mismatch_reason: 'Date of birth is identical across all submitted documents.',
    values_found: transformValuesFoundForStorage(valuesFound, normalizedDatesMap),
    documents_compared: docIdsCompared,
  };
}

function transformValuesFoundForStorage(
  rawMap: Record<string, string>,
  normMap: Record<string, string>
) {
  const result: Array<{ document_type: string; raw_value: string; normalized_value: string }> = [];
  Object.keys(normMap).forEach((slot) => {
    result.push({
      document_type: slot,
      raw_value: rawMap[slot] || normMap[slot],
      normalized_value: normMap[slot],
    });
  });
  return result;
}
