import { NextRequest, NextResponse } from 'next/server';
import { ApplicationRepository } from '@/repositories/application.repository';
import { DocumentRepository } from '@/repositories/document.repository';
import { ExtractedFieldRepository } from '@/repositories/extracted-field.repository';
import { VerificationRepository } from '@/repositories/verification.repository';
import { RiskRepository } from '@/repositories/risk.repository';
import { AuditService } from '@/services/audit/audit.service';
import { AuditRepository } from '@/repositories/audit.repository';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const application = await ApplicationRepository.getById(id);

    if (!application) {
      return NextResponse.json(
        { data: null, error: { message: 'Application not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    const profile = await getCurrentUserProfile();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // SERVER-SIDE OWNERSHIP & ROLE AUTHORIZATION CHECK
    const isOfficer = profile?.role === 'OFFICER';

    if (!isOfficer) {
      // If application is owned by a specific applicant user
      if (application.applicant_user_id) {
        if (!user) {
          return NextResponse.json(
            { data: null, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
            { status: 401 }
          );
        }

        if (application.applicant_user_id !== user.id) {
          return NextResponse.json(
            { data: null, error: { message: 'Access denied: You do not own this application', code: 'FORBIDDEN' } },
            { status: 403 }
          );
        }
      }
    }

    const documents = await DocumentRepository.getByApplicationId(id);
    const extractedFields = await ExtractedFieldRepository.getByApplicationId(id);
    const verificationResults = await VerificationRepository.getByApplicationId(id);
    const riskResult = await RiskRepository.getByApplicationId(id);
    const auditVerification = await AuditService.verifyAuditChain(id);
    const auditEvents = await AuditRepository.getByApplicationId(id);

    return NextResponse.json({
      data: {
        application,
        documents,
        extractedFields,
        verificationResults,
        riskResult,
        auditVerification,
        auditEvents,
      },
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json(
      { data: null, error: { message, code: 'SERVER_ERROR' } },
      { status: 500 }
    );
  }
}
