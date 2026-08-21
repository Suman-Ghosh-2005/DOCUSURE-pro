import { createAdminClient } from '@/lib/supabase/server';
import { OfficerReviewPayload, OfficerReviewRecord } from '@/types/review.types';

export class ReviewRepository {
  private static getClient() {
    return createAdminClient();
  }

  static async create(payload: OfficerReviewPayload): Promise<OfficerReviewRecord | null> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('officer_reviews')
      .insert({
        application_id: payload.application_id,
        decision: payload.decision,
        notes: payload.notes,
        rejection_reasons: payload.rejection_reasons || null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[ReviewRepository.create] Error:', error);
      return null;
    }
    return data as OfficerReviewRecord;
  }

  static async getByApplicationId(applicationId: string): Promise<OfficerReviewRecord[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('officer_reviews')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ReviewRepository.getByApplicationId] Error:', error);
      return [];
    }
    return (data || []) as OfficerReviewRecord[];
  }
}
