import { createAdminClient } from '@/lib/supabase/server';
import { FieldVerificationResult } from '@/types/verification.types';

export class VerificationRepository {
  private static getClient() {
    return createAdminClient();
  }

  static async createBatch(
    results: Omit<FieldVerificationResult, 'id' | 'created_at'>[]
  ): Promise<FieldVerificationResult[]> {
    if (!results.length) return [];
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('verification_results')
      .insert(results)
      .select('*');

    if (error) {
      console.error('[VerificationRepository.createBatch] Error:', error);
      return [];
    }
    return (data || []) as FieldVerificationResult[];
  }

  static async getByApplicationId(applicationId: string): Promise<FieldVerificationResult[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('verification_results')
      .select('*')
      .eq('application_id', applicationId);

    if (error) {
      console.error('[VerificationRepository.getByApplicationId] Error:', error);
      return [];
    }
    return (data || []) as FieldVerificationResult[];
  }

  static async deleteByApplicationId(applicationId: string): Promise<boolean> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from('verification_results')
      .delete()
      .eq('application_id', applicationId);

    if (error) {
      console.error('[VerificationRepository.deleteByApplicationId] Error:', error);
      return false;
    }
    return true;
  }
}
