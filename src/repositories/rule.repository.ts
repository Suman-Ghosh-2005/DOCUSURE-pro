import { createAdminClient } from '@/lib/supabase/server';
import { SchemeRuleVersion, RuleResult } from '@/types/rule.types';

export class RuleRepository {
  private static getClient() {
    return createAdminClient();
  }

  static async getActiveSchemeRules(schemeId: string): Promise<SchemeRuleVersion | null> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('rule_versions')
      .select('*')
      .eq('scheme_id', schemeId)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('[RuleRepository.getActiveSchemeRules] Error:', error);
      return null;
    }
    return data as SchemeRuleVersion;
  }

  static async saveRuleResults(
    results: Omit<RuleResult, 'id' | 'created_at'>[]
  ): Promise<RuleResult[]> {
    if (!results.length) return [];
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('rule_results')
      .insert(results)
      .select('*');

    if (error) {
      console.error('[RuleRepository.saveRuleResults] Error:', error);
      return [];
    }
    return (data || []) as RuleResult[];
  }

  static async getRuleResultsByApplicationId(applicationId: string): Promise<RuleResult[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('rule_results')
      .select('*')
      .eq('application_id', applicationId);

    if (error) {
      console.error('[RuleRepository.getRuleResultsByApplicationId] Error:', error);
      return [];
    }
    return (data || []) as RuleResult[];
  }

  static async deleteRuleResultsByApplicationId(applicationId: string): Promise<boolean> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from('rule_results')
      .delete()
      .eq('application_id', applicationId);

    if (error) {
      console.error('[RuleRepository.deleteRuleResultsByApplicationId] Error:', error);
      return false;
    }
    return true;
  }
}
