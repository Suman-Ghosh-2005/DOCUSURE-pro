import { createAdminClient } from '@/lib/supabase/server';
import { ApplicationException } from '@/types/exception.types';

export class ExceptionRepository {
  private static getClient() {
    return createAdminClient();
  }

  static async createBatch(
    exceptions: Omit<ApplicationException, 'id' | 'created_at'>[]
  ): Promise<ApplicationException[]> {
    if (!exceptions.length) return [];
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('exceptions')
      .insert(exceptions)
      .select('*');

    if (error) {
      console.error('[ExceptionRepository.createBatch] Error:', error);
      return [];
    }
    return (data || []) as ApplicationException[];
  }

  static async getByApplicationId(applicationId: string): Promise<ApplicationException[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('exceptions')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[ExceptionRepository.getByApplicationId] Error:', error);
      return [];
    }
    return (data || []) as ApplicationException[];
  }

  static async deleteByApplicationId(applicationId: string): Promise<boolean> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from('exceptions')
      .delete()
      .eq('application_id', applicationId);

    if (error) {
      console.error('[ExceptionRepository.deleteByApplicationId] Error:', error);
      return false;
    }
    return true;
  }
}
