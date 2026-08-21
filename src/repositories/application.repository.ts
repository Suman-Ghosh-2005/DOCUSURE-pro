import { createAdminClient } from '@/lib/supabase/server';
import { Application, ApplicationStatus, CreateApplicationPayload } from '@/types/application.types';

const memoryUserAppStore = new Map<string, Application[]>();

export class ApplicationRepository {
  private static getClient() {
    return createAdminClient();
  }

  static async create(payload: CreateApplicationPayload): Promise<Application | null> {
    const supabase = this.getClient();

    // Try inserting with applicant_user_id
    const insertPayload: Record<string, unknown> = {
      applicant_name: payload.applicant_name,
      dob: payload.dob || null,
      gender: payload.gender || null,
      scheme_id: payload.scheme_id,
      status: 'DRAFT',
    };

    if (payload.applicant_user_id) {
      insertPayload.applicant_user_id = payload.applicant_user_id;
    }

    let { data, error } = await supabase
      .from('applications')
      .insert(insertPayload)
      .select('*')
      .single();

    // Fallback if applicant_user_id column isn't in remote schema cache yet
    if (error && error.code === 'PGRST204' && payload.applicant_user_id) {
      delete insertPayload.applicant_user_id;
      const fallback = await supabase
        .from('applications')
        .insert(insertPayload)
        .select('*')
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('[ApplicationRepository.create] Error:', error);
      return null;
    }

    const record = { ...data, applicant_user_id: payload.applicant_user_id || data.applicant_user_id || null } as Application;

    if (payload.applicant_user_id) {
      const existing = memoryUserAppStore.get(payload.applicant_user_id) || [];
      existing.unshift(record); // Prepend to top
      memoryUserAppStore.set(payload.applicant_user_id, existing);
    }

    return record;
  }

  static async getById(id: string): Promise<Application | null> {
    try {
      const supabase = this.getClient();
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return data as Application;
      }
    } catch {
      // Fallback
    }

    // Fallback search in memory
    for (const apps of memoryUserAppStore.values()) {
      const found = apps.find((a) => a.id === id);
      if (found) return found;
    }

    return null;
  }

  static async getByUserId(userId: string): Promise<Application[]> {
    const memoryApps = memoryUserAppStore.get(userId) || [];
    try {
      const supabase = this.getClient();
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('applicant_user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const appMap = new Map();
        [...data, ...memoryApps].forEach((a) => appMap.set(a.id, a));
        return (Array.from(appMap.values()) as Application[]).sort((a, b) => {
          const timeA = new Date(a.created_at || 0).getTime();
          const timeB = new Date(b.created_at || 0).getTime();
          return timeB - timeA;
        });
      }
    } catch {
      // Fallback
    }

    return memoryApps;
  }

  static async listAll(): Promise<Application[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ApplicationRepository.listAll] Error:', error);
      return [];
    }

    // Merge in-memory applications
    const allMemoryApps: Application[] = [];
    memoryUserAppStore.forEach((apps) => allMemoryApps.push(...apps));

    const appMap = new Map();
    [...(data || []), ...allMemoryApps].forEach((a) => appMap.set(a.id, a));
    
    // Strict created_at DESC sorting for live presentation ordering
    return (Array.from(appMap.values()) as Application[]).sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }

  static async updateStatus(
    id: string,
    status: ApplicationStatus,
    routingReason?: string,
    _recommendedAction?: string
  ): Promise<boolean> {
    let dbSuccess = false;
    try {
      const supabase = this.getClient();
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (routingReason) updateData.routing_reason = routingReason;

      const { error } = await supabase
        .from('applications')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('[ApplicationRepository.updateStatus] DB error:', error);
        dbSuccess = false;
      } else {
        dbSuccess = true;
      }
    } catch (e) {
      console.warn('[ApplicationRepository.updateStatus] Exception:', e);
      dbSuccess = false;
    }

    // Update in-memory fallback store if present
    memoryUserAppStore.forEach((apps) => {
      const found = apps.find((a) => a.id === id);
      if (found) {
        found.status = status;
        if (routingReason) found.routing_reason = routingReason;
      }
    });

    return dbSuccess;
  }
}
