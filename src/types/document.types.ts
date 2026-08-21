export type DocumentSlotType =
  | 'ID_PROOF'
  | 'INCOME_CERT'
  | 'MARKSHEET'
  | 'DOMICILE_CERT';

export type DocumentProcessingStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'OCR_COMPLETE'
  | 'CLASSIFIED'
  | 'EXTRACTED'
  | 'VERIFIED'
  | 'FAILED';

export interface DocumentRecord {
  id: string;
  application_id: string;
  slot_type: DocumentSlotType;
  document_type?: string;
  status: DocumentProcessingStatus;
  storage_path?: string;
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  ocr_text?: string;
  ocr_confidence?: number;
  classification_confidence?: number;
  classification_reasoning?: string;
  created_at: string;
  updated_at: string;
}

export interface ExtractedField {
  id: string;
  document_id: string;
  application_id: string;
  field_name: string;
  raw_value: string | null;
  normalized_value: string | number | null;
  confidence: number;
  source_text: string | null;
  created_at?: string;
}
