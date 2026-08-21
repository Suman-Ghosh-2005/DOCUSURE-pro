import { NextRequest, NextResponse } from 'next/server';
import { AuditService } from '@/services/audit/audit.service';
import { AuditRepository } from '@/repositories/audit.repository';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const verification = await AuditService.verifyAuditChain(id);
    const events = await AuditRepository.getByApplicationId(id);

    return NextResponse.json({
      data: {
        applicationId: id,
        verification,
        events: events.map((e) => ({
          id: e.id,
          eventType: e.event_type,
          eventData: e.event_data,
          previousHash: e.previous_hash,
          eventHash: e.event_hash,
          createdAt: e.created_at,
          actorType: e.actor_type,
        })),
      },
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch audit verification';
    console.error('[Audit API Error]:', error);
    return NextResponse.json(
      { data: null, error: { message, code: 'AUDIT_FETCH_ERROR' } },
      { status: 500 }
    );
  }
}
