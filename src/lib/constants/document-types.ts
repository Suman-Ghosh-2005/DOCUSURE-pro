import { DocumentSlotType } from '@/types/document.types';

export interface DocumentSlotConfig {
  slotType: DocumentSlotType;
  label: string;
  description: string;
  acceptedFormats: string[];
  maxSizeBytes: number;
  isRequired: boolean;
}

export const SCHOLARSHIP_DOCUMENT_SLOTS: DocumentSlotConfig[] = [
  {
    slotType: 'ID_PROOF',
    label: 'Identity Document',
    description: 'Aadhaar-like card, Voter ID, or official Photo ID showing full name and DOB',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeBytes: 5242880, // 5MB
    isRequired: true,
  },
  {
    slotType: 'INCOME_CERT',
    label: 'Income Certificate',
    description: 'Official state income certificate showing annual family income',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeBytes: 5242880,
    isRequired: true,
  },
  {
    slotType: 'MARKSHEET',
    label: 'Academic Marksheet',
    description: 'Latest qualifying examination mark statement showing aggregate percentage',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeBytes: 5242880,
    isRequired: true,
  },
  {
    slotType: 'DOMICILE_CERT',
    label: 'Domicile Certificate',
    description: 'Official proof of permanent residence in state',
    acceptedFormats: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeBytes: 5242880,
    isRequired: true,
  },
];
