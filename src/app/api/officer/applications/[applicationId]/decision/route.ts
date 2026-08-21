import { NextRequest, NextResponse } from 'next/server';
import { ApplicationRepository } from '@/repositories/application.repository';
import { ReviewRepository } from '@/repositories/review.repository';
import { AuditService } from '@/services/audit/audit.service';
import { officerDecisionSchema } from '@/lib/validators/review.schema';
import { ApplicationStatus } from '@/types/application.types';

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

    const body = await req.json();

    // Server-side Zod validation
    const validationResult = officerDecisionSchema.safeParse(body);
    if (!validationResult.success) {
      const issue = validationResult.error.issues[0];
      return NextResponse.json(
        { data: null, error: { message: issue.message, code: 'INVALID_INPUT' } },
        { status: 400 }
      );
    }

    const { decision, notes, rejection_reasons } = validationResult.data;

    // 1. Map Officer Decision to Application Status
    let targetStatus: ApplicationStatus = 'APPROVED';
    let routingReason = '';

    if (decision === 'APPROVE') {
      targetStatus = 'APPROVED';
      routingReason = `Approved by officer. Notes: ${notes}`;
    } else if (decision === 'REJECT') {
      targetStatus = 'REJECTED';
      routingReason = `Rejected by officer. Reasons: ${(rejection_reasons || []).join(', ')}. Notes: ${notes}`;
    } else if (decision === 'REQUEST_CORRECTION') {
      targetStatus = 'INCOMPLETE';
      routingReason = `Correction requested by officer. Notes: ${notes}`;
    }

    // 2. Update Application Status in Database
    const updated = await ApplicationRepository.updateStatus(
      applicationId,
      targetStatus,
      routingReason
    );

    if (!updated) {
      return NextResponse.json(
        { data: null, error: { message: 'Failed to update application status in database', code: 'DB_UPDATE_ERROR' } },
        { status: 500 }
      );
    }

    // 3. Create Officer Review Record
    const reviewRecord = await ReviewRepository.create({
      application_id: applicationId,
      decision,
      notes,
      rejection_reasons,
    });

    if (!reviewRecord) {
      throw new Error('Failed to record officer review decision');
    }

    // 4. Record Cryptographic Officer Decision Audit Event
    await AuditService.recordAuditEvent({
      applicationId,
      eventType: 'OFFICER_DECISION',
      eventData: {
        decision,
        notes,
        rejection_reasons: rejection_reasons || [],
        target_status: targetStatus,
      },
      actorType: 'OFFICER',
    });

    return NextResponse.json({
      data: {
        applicationId,
        decisionRecord: reviewRecord,
        updatedStatus: targetStatus,
      },
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Officer decision submission error';
    console.error('[Officer Decision Route Error]:', error);
    return NextResponse.json(
      { data: null, error: { message, code: 'OFFICER_DECISION_ERROR' } },
      { status: 500 }
    );
  }
}
