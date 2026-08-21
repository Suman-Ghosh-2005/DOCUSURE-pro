import { createAdminClient } from '@/lib/supabase/server';
import { AuditEventRecord } from '@/types/audit.types';

const memoryAuditStore = new Map<string, AuditEventRecord[]>();

export class AuditRepository {
  /**
   * Insert a new audit event into the database
   */
  static async insertEvent(event: Omit<AuditEventRecord, 'id'>): Promise<AuditEventRecord | null> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('audit_events')
        .insert(event)
        .select('*')
        .single();

      if (!error && data) {
        const existing = memoryAuditStore.get(event.application_id) || [];
        existing.push(data as AuditEventRecord);
        memoryAuditStore.set(event.application_id, existing);
        return data as AuditEventRecord;
      }
    } catch (e) {
      console.warn('[AuditRepository] Supabase insert failed, using fallback in-memory store:', e);
    }

    // In-memory fallback
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: AuditEventRecord = {
      id,
      ...event,
    };

    const existing = memoryAuditStore.get(event.application_id) || [];
    existing.push(record);
    memoryAuditStore.set(event.application_id, existing);

    return record;
  }

  /**
   * Fetch all audit events for an application in chronological order
   */
  static async getByApplicationId(applicationId: string): Promise<AuditEventRecord[]> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('audit_events')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        memoryAuditStore.set(applicationId, data as AuditEventRecord[]);
        return data as AuditEventRecord[];
      }
    } catch {
      // Fallback below
    }

    return memoryAuditStore.get(applicationId) || [];
  }

  /**
   * Fetch latest event to retrieve previous_hash
   */
  static async getLatestByApplicationId(applicationId: string): Promise<AuditEventRecord | null> {
    const events = await this.getByApplicationId(applicationId);
    if (events.length > 0) {
      return events[events.length - 1];
    }
    return null;
  }
}
