import { AuditRepository } from '@/repositories/audit.repository';
import { computeEventHash } from '@/lib/audit/hasher';
import { AuditEventType, AuditActorType, AuditEventRecord, AuditVerificationResult } from '@/types/audit.types';

export class AuditService {
  /**
   * Records a server-side cryptographic audit event chained to the previous event hash.
   */
  static async recordAuditEvent(params: {
    applicationId: string;
    processingJobId?: string | null;
    eventType: AuditEventType;
    eventData: Record<string, unknown>;
    actorType?: AuditActorType;
    actorId?: string | null;
  }): Promise<AuditEventRecord | null> {
    const {
      applicationId,
      processingJobId,
      eventType,
      eventData,
      actorType = 'SYSTEM',
      actorId = null,
    } = params;

    const latestEvent = await AuditRepository.getLatestByApplicationId(applicationId);
    const previousHash = latestEvent ? latestEvent.event_hash : null;
    const createdAt = new Date().toISOString();

    const eventHash = computeEventHash({
      eventType,
      eventData,
      createdAt,
      previousHash,
    });

    return await AuditRepository.insertEvent({
      application_id: applicationId,
      processing_job_id: processingJobId || null,
      event_type: eventType,
      event_data: eventData,
      previous_hash: previousHash,
      event_hash: eventHash,
      created_at: createdAt,
      actor_type: actorType,
      actor_id: actorId,
    });
  }

  /**
   * Cryptographically verifies the audit hash chain for an application.
   * Recomputes every SHA-256 event hash and verifies previous_hash pointers.
   */
  static async verifyAuditChain(applicationId: string): Promise<AuditVerificationResult> {
    const events = await AuditRepository.getByApplicationId(applicationId);

    if (events.length === 0) {
      return {
        valid: true,
        event_count: 0,
        first_invalid_event_id: null,
      };
    }

    for (let i = 0; i < events.length; i++) {
      const current = events[i];

      // 1. Verify previous_hash linkage
      if (i === 0) {
        if (current.previous_hash !== null && current.previous_hash !== '') {
          return {
            valid: false,
            event_count: events.length,
            first_invalid_event_id: current.id,
            reason: 'LINKAGE_BROKEN',
          };
        }
      } else {
        const previous = events[i - 1];
        if (current.previous_hash !== previous.event_hash) {
          return {
            valid: false,
            event_count: events.length,
            first_invalid_event_id: current.id,
            reason: 'LINKAGE_BROKEN',
          };
        }
      }

      // 2. Recompute SHA-256 hash and verify match
      const expectedHash = computeEventHash({
        eventType: current.event_type,
        eventData: current.event_data,
        createdAt: current.created_at,
        previousHash: current.previous_hash,
      });

      if (current.event_hash !== expectedHash) {
        return {
          valid: false,
          event_count: events.length,
          first_invalid_event_id: current.id,
          reason: 'HASH_MISMATCH',
        };
      }
    }

    return {
      valid: true,
      event_count: events.length,
      first_invalid_event_id: null,
    };
  }
}
