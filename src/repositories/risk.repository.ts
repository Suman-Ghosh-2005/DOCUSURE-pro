import { createAdminClient } from '@/lib/supabase/server';
import { RiskRecord, RiskPredictionResult } from '@/types/risk.types';

const memoryRiskStore = new Map<string, RiskRecord>();

export class RiskRepository {
  /**
   * Save a new risk analysis result for an application
   */
  static async saveRiskResult(params: {
    application_id: string;
    processing_job_id?: string | null;
    prediction: RiskPredictionResult;
  }): Promise<RiskRecord | null> {
    const { application_id, processing_job_id, prediction } = params;

    try {
      const supabase = createAdminClient();
      const payload = {
        application_id,
        processing_job_id: processing_job_id || null,
        risk_score: prediction.risk_score,
        risk_level: prediction.risk_level,
        feature_snapshot: prediction.feature_snapshot,
        contributing_signals: prediction.contributing_signals,
        model_name: prediction.model_name,
        model_version: prediction.model_version,
      };

      const { data, error } = await supabase
        .from('risk_results')
        .insert(payload)
        .select('*')
        .single();

      if (!error && data) {
        memoryRiskStore.set(application_id, data as RiskRecord);
        return data as RiskRecord;
      }
    } catch (e) {
      console.warn('[RiskRepository] Supabase insert failed, using fallback in-memory store:', e);
    }

    // In-memory fallback
    const id = `risk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const record: RiskRecord = {
      id,
      application_id,
      processing_job_id: processing_job_id || null,
      risk_score: prediction.risk_score,
      risk_level: prediction.risk_level,
      feature_snapshot: prediction.feature_snapshot,
      contributing_signals: prediction.contributing_signals,
      model_name: prediction.model_name,
      model_version: prediction.model_version,
      created_at: new Date().toISOString(),
    };

    memoryRiskStore.set(application_id, record);
    return record;
  }

  /**
   * Fetch the latest risk result for an application
   */
  static async getByApplicationId(applicationId: string): Promise<RiskRecord | null> {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('risk_results')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        memoryRiskStore.set(applicationId, data as RiskRecord);
        return data as RiskRecord;
      }
    } catch {
      // Fallback below
    }

    return memoryRiskStore.get(applicationId) || null;
  }

  /**
   * Delete prior risk records for clean rerun
   */
  static async deleteByApplicationId(applicationId: string): Promise<void> {
    try {
      const supabase = createAdminClient();
      await supabase.from('risk_results').delete().eq('application_id', applicationId);
    } catch {
      // Fallback below
    }

    memoryRiskStore.delete(applicationId);
  }
}
