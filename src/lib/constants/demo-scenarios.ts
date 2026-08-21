import { DocumentSlotType } from '@/types/document.types';

export type DemoScenarioId =
  | 'SCENARIO_1_VALID'
  | 'SCENARIO_2_NAME_MISMATCH'
  | 'SCENARIO_3_INCOME_INELIGIBLE'
  | 'SCENARIO_4_MISSING_DOC'
  | 'SCENARIO_5_MULTIPLE_ISSUES';

export interface SyntheticDocumentData {
  slotType: DocumentSlotType;
  title: string;
  documentNumber: string;
  issueDate: string;
  issuingAuthority: string;
  fields: Record<string, string | number>;
}

export interface DemoScenarioConfig {
  id: DemoScenarioId;
  name: string;
  badgeLabel: string;
  applicantName: string;
  dob: string;
  gender: string;
  description: string;
  documents: SyntheticDocumentData[];
  expectedStatus: 'VERIFIED' | 'EXCEPTION' | 'INELIGIBLE' | 'INCOMPLETE';
}

export const DEMO_SCENARIOS: Record<DemoScenarioId, DemoScenarioConfig> = {
  SCENARIO_1_VALID: {
    id: 'SCENARIO_1_VALID',
    name: 'Scenario 1 — Valid Application',
    badgeLabel: 'Auto-Approved Test Case',
    applicantName: 'ANANYA GHOSH',
    dob: '2004-03-14',
    gender: 'Female',
    description: 'All 4 documents match perfectly. Income ₹1,82,000 ≤ ₹2.5L limit, Marks 73.5% ≥ 60%, Domicile: West Bengal.',
    expectedStatus: 'VERIFIED',
    documents: [
      {
        slotType: 'ID_PROOF',
        title: 'GOVERNMENT OF WEST BENGAL - IDENTITY CARD',
        documentNumber: 'ID-WB-2024-998811',
        issueDate: '2021-06-15',
        issuingAuthority: 'Department of Home Affairs, Govt of West Bengal',
        fields: {
          'Full Name': 'ANANYA GHOSH',
          'Date of Birth': '2004-03-14',
          'Gender': 'Female',
          'Address': '45 College Street, Kolkata, West Bengal - 700073',
          'ID Number': 'ID-WB-2024-998811',
        },
      },
      {
        slotType: 'INCOME_CERT',
        title: 'DEPARTMENT OF REVENUE - INCOME CERTIFICATE',
        documentNumber: 'INC-WB-2025-442211',
        issueDate: '2025-04-10',
        issuingAuthority: 'Office of the Block Development Officer, Kolkata',
        fields: {
          'Certificate Holder': 'ANANYA GHOSH',
          'Annual Family Income': '₹1,82,000',
          'Income in Words': 'One Lakh Eighty Two Thousand Rupees Only',
          'Financial Year': '2024-2025',
          'Valid Until': '2026-03-31',
        },
      },
      {
        slotType: 'MARKSHEET',
        title: 'WEST BENGAL COUNCIL OF HIGHER SECONDARY EDUCATION',
        documentNumber: 'MRK-WB-2024-771122',
        issueDate: '2024-06-05',
        issuingAuthority: 'Controller of Examinations, WBCHSE',
        fields: {
          'Student Name': 'ANANYA GHOSH',
          'Date of Birth': '2004-03-14',
          'Roll Number': '7112-99381',
          'Marks Obtained': '367',
          'Max Marks': '500',
          'Marks Percentage': '73.5%',
          'Year of Passing': '2024',
        },
      },
      {
        slotType: 'DOMICILE_CERT',
        title: 'GOVERNMENT OF WEST BENGAL - DOMICILE CERTIFICATE',
        documentNumber: 'DOM-WB-2023-112233',
        issueDate: '2023-01-20',
        issuingAuthority: 'Sub-Divisional Officer, District Kolkata',
        fields: {
          'Resident Name': 'ANANYA GHOSH',
          'Date of Birth': '2004-03-14',
          'Domicile State': 'West Bengal',
          'District': 'Kolkata',
          'Permanent Resident': 'Yes',
        },
      },
    ],
  },

  SCENARIO_2_NAME_MISMATCH: {
    id: 'SCENARIO_2_NAME_MISMATCH',
    name: 'Scenario 2 — Name Mismatch',
    badgeLabel: 'Major Exception Test Case',
    applicantName: 'RAHUL KUMAR',
    dob: '2004-08-15',
    gender: 'Male',
    description: 'ID Card says "RAHUL KUMAR", Marksheet says "ROHAN KUMAR". Triggers name mismatch exception.',
    expectedStatus: 'EXCEPTION',
    documents: [
      {
        slotType: 'ID_PROOF',
        title: 'GOVERNMENT OF WEST BENGAL - IDENTITY CARD',
        documentNumber: 'ID-WB-2024-334455',
        issueDate: '2022-03-10',
        issuingAuthority: 'Department of Home Affairs, Govt of West Bengal',
        fields: {
          'Full Name': 'RAHUL KUMAR',
          'Date of Birth': '2004-08-15',
          'Gender': 'Male',
          'Address': '12 Station Road, Howrah, West Bengal - 711101',
          'ID Number': 'ID-WB-2024-334455',
        },
      },
      {
        slotType: 'INCOME_CERT',
        title: 'DEPARTMENT OF REVENUE - INCOME CERTIFICATE',
        documentNumber: 'INC-WB-2025-887766',
        issueDate: '2025-05-12',
        issuingAuthority: 'Office of the Block Development Officer, Howrah',
        fields: {
          'Certificate Holder': 'RAHUL KUMAR',
          'Annual Family Income': '₹1,95,000',
          'Income in Words': 'One Lakh Ninety Five Thousand Rupees Only',
          'Financial Year': '2024-2025',
          'Valid Until': '2026-03-31',
        },
      },
      {
        slotType: 'MARKSHEET',
        title: 'WEST BENGAL COUNCIL OF HIGHER SECONDARY EDUCATION',
        documentNumber: 'MRK-WB-2024-554433',
        issueDate: '2024-06-10',
        issuingAuthority: 'Controller of Examinations, WBCHSE',
        fields: {
          'Student Name': 'ROHAN KUMAR', // Intentional Name Mismatch
          'Date of Birth': '2004-08-15',
          'Roll Number': '4412-88219',
          'Marks Obtained': '340',
          'Max Marks': '500',
          'Marks Percentage': '68.0%',
          'Year of Passing': '2024',
        },
      },
      {
        slotType: 'DOMICILE_CERT',
        title: 'GOVERNMENT OF WEST BENGAL - DOMICILE CERTIFICATE',
        documentNumber: 'DOM-WB-2023-998877',
        issueDate: '2023-04-15',
        issuingAuthority: 'Sub-Divisional Officer, District Howrah',
        fields: {
          'Resident Name': 'RAHUL KUMAR',
          'Date of Birth': '2004-08-15',
          'Domicile State': 'West Bengal',
          'District': 'Howrah',
          'Permanent Resident': 'Yes',
        },
      },
    ],
  },

  SCENARIO_3_INCOME_INELIGIBLE: {
    id: 'SCENARIO_3_INCOME_INELIGIBLE',
    name: 'Scenario 3 — Income Ineligible',
    badgeLabel: 'Auto-Rejected Test Case',
    applicantName: 'SUNITA DEY',
    dob: '2005-01-10',
    gender: 'Female',
    description: 'Annual family income is ₹4,20,000 (exceeds ₹2,50,000 scheme threshold). Evaluated deterministically by rule engine.',
    expectedStatus: 'INELIGIBLE',
    documents: [
      {
        slotType: 'ID_PROOF',
        title: 'GOVERNMENT OF WEST BENGAL - IDENTITY CARD',
        documentNumber: 'ID-WB-2024-112244',
        issueDate: '2022-09-01',
        issuingAuthority: 'Department of Home Affairs, Govt of West Bengal',
        fields: {
          'Full Name': 'SUNITA DEY',
          'Date of Birth': '2005-01-10',
          'Gender': 'Female',
          'Address': '88 Park Street, Kolkata, West Bengal - 700016',
          'ID Number': 'ID-WB-2024-112244',
        },
      },
      {
        slotType: 'INCOME_CERT',
        title: 'DEPARTMENT OF REVENUE - INCOME CERTIFICATE',
        documentNumber: 'INC-WB-2025-990011',
        issueDate: '2025-04-02',
        issuingAuthority: 'Office of the Block Development Officer, Kolkata',
        fields: {
          'Certificate Holder': 'SUNITA DEY',
          'Annual Family Income': '₹4,20,000', // Exceeds ₹2,50,000 Limit
          'Income in Words': 'Four Lakh Twenty Thousand Rupees Only',
          'Financial Year': '2024-2025',
          'Valid Until': '2026-03-31',
        },
      },
      {
        slotType: 'MARKSHEET',
        title: 'WEST BENGAL COUNCIL OF HIGHER SECONDARY EDUCATION',
        documentNumber: 'MRK-WB-2024-223344',
        issueDate: '2024-06-05',
        issuingAuthority: 'Controller of Examinations, WBCHSE',
        fields: {
          'Student Name': 'SUNITA DEY',
          'Date of Birth': '2005-01-10',
          'Roll Number': '8812-11029',
          'Marks Obtained': '390',
          'Max Marks': '500',
          'Marks Percentage': '78.0%',
          'Year of Passing': '2024',
        },
      },
      {
        slotType: 'DOMICILE_CERT',
        title: 'GOVERNMENT OF WEST BENGAL - DOMICILE CERTIFICATE',
        documentNumber: 'DOM-WB-2023-445566',
        issueDate: '2023-02-11',
        issuingAuthority: 'Sub-Divisional Officer, District Kolkata',
        fields: {
          'Resident Name': 'SUNITA DEY',
          'Date of Birth': '2005-01-10',
          'Domicile State': 'West Bengal',
          'District': 'Kolkata',
          'Permanent Resident': 'Yes',
        },
      },
    ],
  },

  SCENARIO_4_MISSING_DOC: {
    id: 'SCENARIO_4_MISSING_DOC',
    name: 'Scenario 4 — Missing Document',
    badgeLabel: 'Incomplete Test Case',
    applicantName: 'DEBJIT MONDAL',
    dob: '2004-11-30',
    gender: 'Male',
    description: 'Income Certificate is omitted. Application status becomes INCOMPLETE to prompt applicant resubmission.',
    expectedStatus: 'INCOMPLETE',
    documents: [
      {
        slotType: 'ID_PROOF',
        title: 'GOVERNMENT OF WEST BENGAL - IDENTITY CARD',
        documentNumber: 'ID-WB-2024-667788',
        issueDate: '2021-11-15',
        issuingAuthority: 'Department of Home Affairs, Govt of West Bengal',
        fields: {
          'Full Name': 'DEBJIT MONDAL',
          'Date of Birth': '2004-11-30',
          'Gender': 'Male',
          'Address': '23 Grand Trunk Road, Burdwan, West Bengal - 713101',
          'ID Number': 'ID-WB-2024-667788',
        },
      },
      // INCOME_CERT omitted intentionally
      {
        slotType: 'MARKSHEET',
        title: 'WEST BENGAL COUNCIL OF HIGHER SECONDARY EDUCATION',
        documentNumber: 'MRK-WB-2024-998811',
        issueDate: '2024-06-08',
        issuingAuthority: 'Controller of Examinations, WBCHSE',
        fields: {
          'Student Name': 'DEBJIT MONDAL',
          'Date of Birth': '2004-11-30',
          'Roll Number': '3312-77491',
          'Marks Obtained': '325',
          'Max Marks': '500',
          'Marks Percentage': '65.0%',
          'Year of Passing': '2024',
        },
      },
      {
        slotType: 'DOMICILE_CERT',
        title: 'GOVERNMENT OF WEST BENGAL - DOMICILE CERTIFICATE',
        documentNumber: 'DOM-WB-2023-221144',
        issueDate: '2023-05-19',
        issuingAuthority: 'Sub-Divisional Officer, District Burdwan',
        fields: {
          'Resident Name': 'DEBJIT MONDAL',
          'Date of Birth': '2004-11-30',
          'Domicile State': 'West Bengal',
          'District': 'Burdwan',
          'Permanent Resident': 'Yes',
        },
      },
    ],
  },

  SCENARIO_5_MULTIPLE_ISSUES: {
    id: 'SCENARIO_5_MULTIPLE_ISSUES',
    name: 'Scenario 5 — Multiple Issues',
    badgeLabel: 'Multiple Exceptions Test Case',
    applicantName: 'KAVITA SINGH',
    dob: '2004-06-20',
    gender: 'Female',
    description: 'DOB year mismatch across documents + Name spelling variation + Income exceeds limit (₹3,80,000).',
    expectedStatus: 'EXCEPTION',
    documents: [
      {
        slotType: 'ID_PROOF',
        title: 'GOVERNMENT OF WEST BENGAL - IDENTITY CARD',
        documentNumber: 'ID-WB-2024-556677',
        issueDate: '2022-01-10',
        issuingAuthority: 'Department of Home Affairs, Govt of West Bengal',
        fields: {
          'Full Name': 'KAVITA SINGH',
          'Date of Birth': '2003-06-20', // Intentional DOB Year Mismatch (2003 vs 2004)
          'Gender': 'Female',
          'Address': '77 Lake Road, Siliguri, West Bengal - 734001',
          'ID Number': 'ID-WB-2024-556677',
        },
      },
      {
        slotType: 'INCOME_CERT',
        title: 'DEPARTMENT OF REVENUE - INCOME CERTIFICATE',
        documentNumber: 'INC-WB-2025-112233',
        issueDate: '2025-04-18',
        issuingAuthority: 'Office of the Block Development Officer, Siliguri',
        fields: {
          'Certificate Holder': 'KAVITA SINGH',
          'Annual Family Income': '₹3,80,000', // Exceeds Limit
          'Income in Words': 'Three Lakh Eighty Thousand Rupees Only',
          'Financial Year': '2024-2025',
          'Valid Until': '2026-03-31',
        },
      },
      {
        slotType: 'MARKSHEET',
        title: 'WEST BENGAL COUNCIL OF HIGHER SECONDARY EDUCATION',
        documentNumber: 'MRK-WB-2024-778899',
        issueDate: '2024-06-05',
        issuingAuthority: 'Controller of Examinations, WBCHSE',
        fields: {
          'Student Name': 'KAVITHA SINGH', // Name Spelling Variation
          'Date of Birth': '2004-06-20',
          'Roll Number': '5512-44102',
          'Marks Obtained': '310',
          'Max Marks': '500',
          'Marks Percentage': '62.0%',
          'Year of Passing': '2024',
        },
      },
      {
        slotType: 'DOMICILE_CERT',
        title: 'GOVERNMENT OF WEST BENGAL - DOMICILE CERTIFICATE',
        documentNumber: 'DOM-WB-2023-667788',
        issueDate: '2023-03-22',
        issuingAuthority: 'Sub-Divisional Officer, District Siliguri',
        fields: {
          'Resident Name': 'KAVITA SINGH',
          'Date of Birth': '2004-06-20',
          'Domicile State': 'West Bengal',
          'District': 'Siliguri',
          'Permanent Resident': 'Yes',
        },
      },
    ],
  },
};
