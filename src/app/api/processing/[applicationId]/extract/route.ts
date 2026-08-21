import { NextRequest, NextResponse } from 'next/server';
import { ApplicationRepository } from '@/repositories/application.repository';
import { DocumentRepository } from '@/repositories/document.repository';
import { ExtractedFieldRepository } from '@/repositories/extracted-field.repository';
import { AIService } from '@/services/ai/ai.service';
import { GeminiQuotaError } from '@/lib/ai/gemini';

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

    const documents = await DocumentRepository.getByApplicationId(applicationId);

    if (!documents.length) {
      return NextResponse.json(
        { data: null, error: { message: 'No documents found for extraction', code: 'NO_DOCUMENTS' } },
        { status: 400 }
      );
    }

    await ApplicationRepository.updateStatus(applicationId, 'PROCESSING', undefined, 'Running AI Field Extraction');

    let totalFieldsExtracted = 0;
    let geminiRequestsSent = 0;

    const extractionSummary: Array<{
      document_id: string;
      slot_type: string;
      classified_type: string;
      fields_count: number;
      sample_fields: Record<string, string | number | null>;
    }> = [];

    // STEP 7: CACHING CHECK BEFORE GEMINI
    const existingFields = await ExtractedFieldRepository.getByApplicationId(applicationId);

    const uncachedDocs = documents.filter((doc) => {
      if (!doc.ocr_text) return false;
      const cached = existingFields.filter((f) => f.document_id === doc.id);
      return cached.length === 0 || !doc.document_type || doc.status !== 'EXTRACTED';
    });

    // CACHED RERUN: 0 GEMINI REQUESTS SENT
    if (uncachedDocs.length === 0) {
      console.log(`[DOCUSURE AI] All ${documents.length} documents already cached in DB.`);
      console.log(`[DOCUSURE AI] TOTAL GEMINI REQUESTS FOR APPLICATION: 0`);

      for (const doc of documents) {
        if (!doc.ocr_text) continue;
        const cachedFields = existingFields.filter((f) => f.document_id === doc.id);
        const sampleMap: Record<string, string | number | null> = {};
        cachedFields.forEach((f) => {
          sampleMap[f.field_name] = f.normalized_value;
        });

        totalFieldsExtracted += cachedFields.length;
        extractionSummary.push({
          document_id: doc.id,
          slot_type: doc.slot_type,
          classified_type: doc.document_type || doc.slot_type,
          fields_count: cachedFields.length,
          sample_fields: sampleMap,
        });
      }

      await ApplicationRepository.updateStatus(applicationId, 'PROCESSING', undefined, 'AI Field Extraction Complete');

      return NextResponse.json({
        data: {
          application_id: applicationId,
          documents_processed: documents.length,
          total_fields_extracted: totalFieldsExtracted,
          gemini_requests_sent: 0,
          summary: extractionSummary,
        },
        error: null,
      });
    }

    // STEP 3 & 4: EXACTLY ONE APPLICATION-LEVEL GEMINI REQUEST (NO CLASSIFICATION OR SECONDARY CALLS)
    geminiRequestsSent = 1;

    console.log(`[DOCUSURE AI] GEMINI REQUEST START (Application ID: ${applicationId}, Documents: ${uncachedDocs.length})`);
    console.log(`[DOCUSURE AI] GEMINI REQUEST COUNT = 1`);

    const inputPayload = uncachedDocs.map((doc) => ({
      id: doc.id,
      slot_type: doc.slot_type,
      ocr_text: doc.ocr_text || '',
    }));

    // Single Gemini call for the entire application
    const multiDocResult = await AIService.processApplicationMultiDoc(inputPayload);

    for (const docResult of multiDocResult.documents) {
      // 1. Save classification metadata directly from the single response
      await DocumentRepository.updateClassification(
        docResult.document_id,
        docResult.classified_type,
        docResult.classification_confidence,
        docResult.classification_reasoning
      );

      // 2. Prepare extracted fields payload
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
        totalFieldsExtracted += dbPayload.length;
      }

      await DocumentRepository.updateStatus(docResult.document_id, 'EXTRACTED');

      const sampleMap: Record<string, string | number | null> = {};
      docResult.fields.forEach((f) => {
        sampleMap[f.field_name] = f.normalized_value;
      });

      extractionSummary.push({
        document_id: docResult.document_id,
        slot_type: docResult.slot_type,
        classified_type: docResult.classified_type,
        fields_count: docResult.fields.length,
        sample_fields: sampleMap,
      });
    }

    // STEP 5: RUNTIME COUNTER LOG
    console.log(`[DOCUSURE AI] TOTAL GEMINI REQUESTS FOR APPLICATION: ${geminiRequestsSent}`);

    await ApplicationRepository.updateStatus(applicationId, 'PROCESSING', undefined, 'AI Field Extraction Complete');

    return NextResponse.json({
      data: {
        application_id: applicationId,
        documents_processed: documents.length,
        total_fields_extracted: totalFieldsExtracted,
        gemini_requests_sent: geminiRequestsSent,
        summary: extractionSummary,
      },
      error: null,
    });
  } catch (error: unknown) {
    console.error('[AI Extraction Route Error]:', error);

    // STEP 8: RETURN HTTP 429 FOR AI RATE LIMIT FAILURE
    if (error instanceof GeminiQuotaError) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: 'AI_RATE_LIMITED',
            message: 'Gemini API rate limit reached.',
            retry_after_seconds: error.retryAfterSeconds,
          },
        },
        { status: 429 }
      );
    }

    const message = error instanceof Error ? error.message : 'AI field extraction pipeline error';
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'AI_RATE_LIMITED',
          message: `Gemini extraction temporarily unavailable: ${message}`,
          retry_after_seconds: 13,
        },
      },
      { status: 503 }
    );
  }
}
