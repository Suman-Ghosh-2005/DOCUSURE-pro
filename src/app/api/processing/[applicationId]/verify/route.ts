import { NextRequest, NextResponse } from 'next/server';
import { ApplicationRepository } from '@/repositories/application.repository';
import { DocumentRepository } from '@/repositories/document.repository';
import { ExtractedFieldRepository } from '@/repositories/extracted-field.repository';
import { VerificationRepository } from '@/repositories/verification.repository';
import { runCrossDocumentVerification } from '@/services/verification/cross-document.engine';

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
    const extractedFields = await ExtractedFieldRepository.getByApplicationId(applicationId);

    if (!documents.length) {
      return NextResponse.json(
        { data: null, error: { message: 'No documents found for verification', code: 'NO_DOCUMENTS' } },
        { status: 400 }
      );
    }

    await ApplicationRepository.updateStatus(
      applicationId,
      'PROCESSING',
      undefined,
      'Running Cross-Document Verification'
    );

    // Delete prior verification records for clean rerun
    await VerificationRepository.deleteByApplicationId(applicationId);

    const verificationSummary = runCrossDocumentVerification(
      applicationId,
      documents,
      extractedFields
    );

    const dbPayload = verificationSummary.results.map((r) => ({
      application_id: applicationId,
      field_name: r.field_name,
      status: r.status,
      values_found: r.values_found,
      similarity_score: r.similarity_score,
      mismatch_reason: r.mismatch_reason,
    }));

    if (dbPayload.length > 0) {
      await VerificationRepository.createBatch(dbPayload);
    }

    await ApplicationRepository.updateStatus(
      applicationId,
      'PROCESSING',
      undefined,
      'Cross-Document Verification Complete'
    );

    return NextResponse.json({
      data: {
        applicationId,
        overallStatus: verificationSummary.overall_status,
        checks: verificationSummary.checks,
        results: verificationSummary.results,
      },
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cross-document verification error';
    console.error('[Verification Route Error]:', error);
    return NextResponse.json(
      { data: null, error: { message, code: 'VERIFICATION_PIPELINE_ERROR' } },
      { status: 500 }
    );
  }
}
