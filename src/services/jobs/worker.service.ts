import { JobRepository } from '@/repositories/job.repository';
import { ApplicationRepository } from '@/repositories/application.repository';
import { DocumentRepository } from '@/repositories/document.repository';
import { ExtractedFieldRepository } from '@/repositories/extracted-field.repository';
import { VerificationRepository } from '@/repositories/verification.repository';
import { RuleRepository } from '@/repositories/rule.repository';
import { ExceptionRepository } from '@/repositories/exception.repository';
import { RiskRepository } from '@/repositories/risk.repository';
import { AuditService } from '@/services/audit/audit.service';
import { extractTextFromDocumentBuffer } from '@/services/ocr/tesseract.service';
import { AIService } from '@/services/ai/ai.service';
import { runCrossDocumentVerification } from '@/services/verification/cross-document.engine';
import { evaluateEligibility } from '@/services/rules/eligibility.engine';
import { FeatureExtractor } from '@/services/risk/feature.extractor';
import { RiskEngine } from '@/services/risk/risk.engine';
import { DEFAULT_SCHEME_RULES, DEFAULT_SCHEME_ID } from '@/lib/constants/default-rules';
import { RuleDefinition } from '@/types/rule.types';
import { createAdminClient } from '@/lib/supabase/server';

export async function processJobAsync(jobId: string): Promise<void> {
  return executeJobWorker(jobId);
}

export async function executeJobWorker(jobId: string): Promise<void> {
  console.log(`[PROD WORKER] JOB START jobId=${jobId}`);

  // ATOMIC CLAIM: Prevent duplicate worker invocations from processing the same job
  const claimed = await JobRepository.claimJob(jobId);
  if (!claimed) {
    console.warn(`[PROD WORKER] Job ${jobId} already claimed or processing by another worker instance. Skipping.`);
    return;
  }

  console.log(`[PROD WORKER] JOB CLAIM jobId=${jobId}`);
  const job = await JobRepository.getById(jobId);
  if (!job) {
    console.error(`[PROD WORKER] JOB ERROR jobId=${jobId} stage=CLAIM error=Job not found in database`);
    return;
  }

  const applicationId = job.application_id;

  try {
    const application = await ApplicationRepository.getById(applicationId);
    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }

    // Record initial application event if not exists
    await AuditService.recordAuditEvent({
      applicationId,
      processingJobId: jobId,
      eventType: 'APPLICATION_CREATED',
      eventData: { applicant_name: application.applicant_name, scheme_id: application.scheme_id },
    });

    // -----------------------------------------------------------------
    // STAGE 1: OCR TEXT EXTRACTION
    // -----------------------------------------------------------------
    console.log(`[PROD WORKER] OCR START jobId=${jobId}`);
    await JobRepository.updateStatus(jobId, 'PROCESSING', 'OCR');
    await ApplicationRepository.updateStatus(applicationId, 'PROCESSING', undefined, 'Running Server-Side OCR');

    let documents = await DocumentRepository.getByApplicationId(applicationId);
    const supabaseAdmin = createAdminClient();

    for (const doc of documents) {
      if (!doc.ocr_text && doc.storage_path) {
        console.log(`[PROD WORKER] OCR DOCUMENT START jobId=${jobId} documentId=${doc.id}`);
        try {
          const { data: fileData, error: downloadErr } = await supabaseAdmin.storage
            .from('docusure-documents')
            .download(doc.storage_path);

          if (downloadErr) {
            console.error(`[PROD WORKER] JOB ERROR jobId=${jobId} stage=OCR_DOWNLOAD error=${downloadErr.message}`);
          }

          if (!downloadErr && fileData) {
            const arrayBuffer = await fileData.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const ocrResult = await extractTextFromDocumentBuffer(buffer, doc.mime_type || 'application/pdf');
            await DocumentRepository.updateOCRResult(doc.id, ocrResult.raw_text, ocrResult.ocr_confidence);
          }
        } catch (docErr: unknown) {
          const docErrMsg = docErr instanceof Error ? docErr.message : String(docErr);
          console.error(`[PROD WORKER] JOB ERROR jobId=${jobId} stage=OCR_DOCUMENT documentId=${doc.id} error=${docErrMsg}`);
        }
        console.log(`[PROD WORKER] OCR DOCUMENT END jobId=${jobId} documentId=${doc.id}`);
      }
    }

    documents = await DocumentRepository.getByApplicationId(applicationId);
    console.log(`[PROD WORKER] OCR END jobId=${jobId}`);

    // Record OCR Audit Event
    await AuditService.recordAuditEvent({
      applicationId,
      processingJobId: jobId,
      eventType: 'OCR_COMPLETED',
      eventData: { documents_processed: documents.length },
    });

    // -----------------------------------------------------------------
    // STAGE 2: AI FIELD EXTRACTION (EXACTLY 1 GEMINI REQUEST TOTAL)
    // -----------------------------------------------------------------
    console.log(`[PROD WORKER] AI START jobId=${jobId}`);
    await JobRepository.updateStatus(jobId, 'PROCESSING', 'AI_EXTRACTION');
    await ApplicationRepository.updateStatus(applicationId, 'PROCESSING', undefined, 'Running AI Field Extraction');

    const existingFields = await ExtractedFieldRepository.getByApplicationId(applicationId);

    const uncachedDocs = documents.filter((doc) => {
      if (!doc.ocr_text) return false;
      const cached = existingFields.filter((f) => f.document_id === doc.id);
      return cached.length === 0 || !doc.document_type || doc.status !== 'EXTRACTED';
    });

    if (uncachedDocs.length > 0) {
      console.log(`[PROD WORKER] AI Executing 1 Gemini request for ${uncachedDocs.length} uncached documents (jobId=${jobId})`);
      const inputPayload = uncachedDocs.map((doc) => ({
        id: doc.id,
        slot_type: doc.slot_type,
        ocr_text: doc.ocr_text || '',
      }));

      const multiDocResult = await AIService.processApplicationMultiDoc(inputPayload);

      for (const docResult of multiDocResult.documents) {
        await DocumentRepository.updateClassification(
          docResult.document_id,
          docResult.classified_type,
          docResult.classification_confidence,
          docResult.classification_reasoning
        );

        const dbPayload = docResult.fields.map((f) => ({
          document_id: docResult.document_id,
          application_id: applicationId,
          field_name: f.field_name,
          raw_value: f.raw_value,
          normalized_value: f.normalized_value ? String(f.normalized_value) : null,
          confidence: f.confidence,
          source_text: f.source_text,
        }));

        if (dbPayload.length > 0) {
          await ExtractedFieldRepository.createBatch(dbPayload);
        }

        await DocumentRepository.updateStatus(docResult.document_id, 'EXTRACTED');
      }
    } else {
      console.log(`[PROD WORKER] AI Using cached extraction fields. 0 Gemini requests sent.`);
    }

    console.log(`[PROD WORKER] AI END jobId=${jobId}`);

    // Record AI Extraction Audit Event
    const freshExtractedFieldsForAudit = await ExtractedFieldRepository.getByApplicationId(applicationId);
    await AuditService.recordAuditEvent({
      applicationId,
      processingJobId: jobId,
      eventType: 'AI_EXTRACTION_COMPLETED',
      eventData: { total_fields_extracted: freshExtractedFieldsForAudit.length },
    });

    // -----------------------------------------------------------------
    // STAGE 3: STALE RESULT PROTECTION & CROSS-DOCUMENT VERIFICATION
    // -----------------------------------------------------------------
    await JobRepository.updateStatus(jobId, 'PROCESSING', 'VERIFICATION');
    await ApplicationRepository.updateStatus(applicationId, 'PROCESSING', undefined, 'Running Cross-Document Verification');

    await VerificationRepository.deleteByApplicationId(applicationId);
    await RuleRepository.deleteRuleResultsByApplicationId(applicationId);
    await ExceptionRepository.deleteByApplicationId(applicationId);
    await RiskRepository.deleteByApplicationId(applicationId);

    const freshExtractedFields = await ExtractedFieldRepository.getByApplicationId(applicationId);

    const verificationSummary = runCrossDocumentVerification(
      applicationId,
      documents,
      freshExtractedFields
    );

    const dbVerificationPayload = verificationSummary.results.map((r) => ({
      application_id: applicationId,
      field_name: r.field_name,
      status: r.status,
      values_found: r.values_found,
      similarity_score: r.similarity_score,
      mismatch_reason: r.mismatch_reason,
    }));

    if (dbVerificationPayload.length > 0) {
      await VerificationRepository.createBatch(dbVerificationPayload);
    }

    console.log(`[PROD WORKER] VERIFICATION END jobId=${jobId}`);

    // Record Verification Audit Event
    await AuditService.recordAuditEvent({
      applicationId,
      processingJobId: jobId,
      eventType: 'VERIFICATION_COMPLETED',
      eventData: { verification_status: verificationSummary.overall_status },
    });

    // -----------------------------------------------------------------
    // STAGE 4: SCHEME ELIGIBILITY ENGINE
    // -----------------------------------------------------------------
    await JobRepository.updateStatus(jobId, 'PROCESSING', 'ELIGIBILITY');
    await ApplicationRepository.updateStatus(applicationId, 'PROCESSING', undefined, 'Evaluating Scheme Eligibility');

    const schemeId = application.scheme_id || DEFAULT_SCHEME_ID;
    const activeSchemeRuleRecord = await RuleRepository.getActiveSchemeRules(schemeId);
    let rulesToEvaluate: RuleDefinition[] = DEFAULT_SCHEME_RULES;

    if (activeSchemeRuleRecord && activeSchemeRuleRecord.rules_json?.rules) {
      rulesToEvaluate = activeSchemeRuleRecord.rules_json.rules;
    }

    const freshVerificationResults = await VerificationRepository.getByApplicationId(applicationId);

    const evaluation = evaluateEligibility({
      application,
      documents,
      extractedFields: freshExtractedFields,
      verificationResults: freshVerificationResults,
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

    console.log(`[PROD WORKER] ELIGIBILITY END jobId=${jobId}`);

    // Record Eligibility Audit Event
    await AuditService.recordAuditEvent({
      applicationId,
      processingJobId: jobId,
      eventType: 'ELIGIBILITY_EVALUATED',
      eventData: { overall_status: evaluation.overall_status },
    });

    // -----------------------------------------------------------------
    // STAGE 5: ML RISK INTELLIGENCE
    // -----------------------------------------------------------------
    await JobRepository.updateStatus(jobId, 'PROCESSING', 'RISK');
    await ApplicationRepository.updateStatus(applicationId, 'PROCESSING', undefined, 'Running ML Risk Analysis');

    const freshRuleResults = await RuleRepository.getRuleResultsByApplicationId(applicationId);
    const freshExceptions = await ExceptionRepository.getByApplicationId(applicationId);

    const riskFeatures = FeatureExtractor.extractFeatures({
      application,
      documents,
      extractedFields: freshExtractedFields,
      verificationResults: freshVerificationResults,
      ruleResults: freshRuleResults,
      exceptions: freshExceptions,
    });

    const riskPrediction = RiskEngine.predict(riskFeatures);

    await RiskRepository.saveRiskResult({
      application_id: applicationId,
      processing_job_id: jobId,
      prediction: riskPrediction,
    });

    console.log(`[PROD WORKER] RISK END jobId=${jobId}`);

    // Record Risk Audit Event
    await AuditService.recordAuditEvent({
      applicationId,
      processingJobId: jobId,
      eventType: 'RISK_EVALUATED',
      eventData: { risk_score: riskPrediction.risk_score, risk_level: riskPrediction.risk_level },
    });

    // STAGE 6: COMPLETED
    await JobRepository.updateStatus(jobId, 'COMPLETED', 'COMPLETED', null);
    console.log(`[PROD WORKER] JOB COMPLETE jobId=${jobId}`);
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[PROD WORKER] JOB ERROR jobId=${jobId} stage=WORKER_EXECUTION error=${errorMsg}`);

    if (job.attempts < 1) {
      console.log(`[PROD WORKER] Retrying job ${jobId} (Attempt ${job.attempts + 1})...`);
      await JobRepository.updateStatus(jobId, 'QUEUED', 'OCR', errorMsg);
      executeJobWorker(jobId).catch((err) => console.error(`[PROD WORKER] JOB ERROR jobId=${jobId} stage=RETRY error=`, err));
    } else {
      await JobRepository.updateStatus(jobId, 'FAILED', 'FAILED', errorMsg);
    }
  }
}
