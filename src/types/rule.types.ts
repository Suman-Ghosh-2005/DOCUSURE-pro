export type RuleEvaluationStatus = 'PASS' | 'FAIL' | 'INCONCLUSIVE' | 'ERROR';

export type RuleOperator = 'EQ' | 'NEQ' | 'LT' | 'GT' | 'LTE' | 'GTE' | 'IN';

export interface LeafCondition {
  type: 'LEAF';
  field: string;
  operator: RuleOperator;
  value: string | number | string[];
}

export interface AndCondition {
  type: 'AND';
  conditions: RuleCondition[];
}

export interface OrCondition {
  type: 'OR';
  conditions: RuleCondition[];
}

export type RuleCondition = LeafCondition | AndCondition | OrCondition;

export interface RuleDefinition {
  id: string;
  name: string;
  description: string;
  is_blocking: boolean;
  condition: RuleCondition;
}

export interface SchemeRuleVersion {
  id: string;
  scheme_id: string;
  version: number;
  rules_json: {
    scheme_name: string;
    version: number;
    rules: RuleDefinition[];
  };
  is_active: boolean;
  created_at: string;
}

export interface RuleResult {
  id?: string;
  application_id: string;
  rule_id: string;
  rule_name: string;
  status: RuleEvaluationStatus;
  evaluated_value: string | null;
  threshold: string | null;
  operator?: RuleOperator;
  reason: string;
  is_blocking: boolean;
  created_at?: string;
}
