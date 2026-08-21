import { createAdminClient } from '@/lib/supabase/server';
import { ExtractedField } from '@/types/document.types';

export class ExtractedFieldRepository {
  private static getClient() {
    return createAdminClient();
  }

  static async createBatch(fields: Omit<ExtractedField, 'id' | 'created_at'>[]): Promise<ExtractedField[]> {
    if (!fields.length) return [];
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('extracted_fields')
      .insert(fields)
      .select('*');

    if (error) {
      console.error('[ExtractedFieldRepository.createBatch] Error:', error);
      return [];
    }
    return (data || []) as ExtractedField[];
  }

  static async getByApplicationId(applicationId: string): Promise<ExtractedField[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('extracted_fields')
      .select('*')
      .eq('application_id', applicationId);

    if (error) {
      console.error('[ExtractedFieldRepository.getByApplicationId] Error:', error);
      return [];
    }
    return (data || []) as ExtractedField[];
  }

  static async deleteByApplicationId(applicationId: string): Promise<boolean> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from('extracted_fields')
      .delete()
      .eq('application_id', applicationId);

    if (error) {
      console.error('[ExtractedFieldRepository.deleteByApplicationId] Error:', error);
      return false;
    }
    return true;
  }
}
