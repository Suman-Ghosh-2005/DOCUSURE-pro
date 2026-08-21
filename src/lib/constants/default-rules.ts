import { RuleDefinition } from '@/types/rule.types';

export const DEFAULT_SCHEME_ID = 'a1b2c3d4-e5f6-4a5b-8c7d-9e8f7a6b5c4d';
export const DEFAULT_SCHEME_NAME = 'West Bengal State Merit Scholarship';

export const DEFAULT_SCHEME_RULES: RuleDefinition[] = [
  {
    id: 'income_check',
    name: 'Income Eligibility',
    description: 'Annual family income must not exceed ₹2,50,000',
    is_blocking: true,
    condition: {
      type: 'LEAF',
      field: 'annual_income',
      operator: 'LTE',
      value: 250000,
    },
  },
  {
    id: 'marks_check',
    name: 'Academic Merit Requirement',
    description: 'Academic marks percentage must be at least 60.0%',
    is_blocking: true,
    condition: {
      type: 'LEAF',
      field: 'marks_percentage',
      operator: 'GTE',
      value: 60.0,
    },
  },
  {
    id: 'domicile_check',
    name: 'State Domicile Requirement',
    description: 'Applicant must be domiciled in West Bengal',
    is_blocking: true,
    condition: {
      type: 'LEAF',
      field: 'domicile_state',
      operator: 'EQ',
      value: 'West Bengal',
    },
  },
];
