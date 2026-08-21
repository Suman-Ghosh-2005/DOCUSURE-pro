import { createAdminClient } from '@/lib/supabase/server';
import { DocumentRecord, DocumentSlotType, DocumentProcessingStatus } from '@/types/document.types';

export class DocumentRepository {
  private static getClient() {
    return createAdminClient();
  }

  static async create(payload: {
    application_id: string;
    slot_type: DocumentSlotType;
    storage_path?: string;
    original_filename?: string;
    mime_type?: string;
    file_size_bytes?: number;
  }): Promise<DocumentRecord | null> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('documents')
      .insert({
        application_id: payload.application_id,
        slot_type: payload.slot_type,
        storage_path: payload.storage_path || null,
        original_filename: payload.original_filename || null,
        mime_type: payload.mime_type || null,
        file_size_bytes: payload.file_size_bytes || null,
        status: 'UPLOADED',
      })
      .select('*')
      .single();

    if (error) {
      console.error('[DocumentRepository.create] Error:', error);
      return null;
    }
    return data as DocumentRecord;
  }

  static async getByApplicationId(applicationId: string): Promise<DocumentRecord[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[DocumentRepository.getByApplicationId] Error:', error);
      return [];
    }
    return (data || []) as DocumentRecord[];
  }

  static async updateOCRResult(
    documentId: string,
    ocrText: string,
    ocrConfidence: number
  ): Promise<boolean> {
    // Defensive sanitation: strip NUL bytes (\u0000 / \0) to prevent PostgreSQL Error 22P05
    const sanitizedText = (ocrText || '').replace(/\0/g, '').replace(/\u0000/g, '');

    const supabase = this.getClient();
    const { error } = await supabase
      .from('documents')
      .update({
        ocr_text: sanitizedText,
        ocr_confidence: ocrConfidence,
        status: 'OCR_COMPLETE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (error) {
      console.error('[DocumentRepository.updateOCRResult] Error:', error);
      return false;
    }
    return true;
  }

  static async updateClassification(
    documentId: string,
    documentType: string,
    confidence: number,
    reasoning?: string
  ): Promise<boolean> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from('documents')
      .update({
        document_type: documentType,
        classification_confidence: confidence,
        classification_reasoning: reasoning || null,
        status: 'CLASSIFIED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (error) {
      console.error('[DocumentRepository.updateClassification] Error:', error);
      return false;
    }
    return true;
  }

  static async updateStatus(documentId: string, status: DocumentProcessingStatus): Promise<boolean> {
    const supabase = this.getClient();
    const { error } = await supabase
      .from('documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', documentId);

    if (error) {
      console.error('[DocumentRepository.updateStatus] Error:', error);
      return false;
    }
    return true;
  }
}
