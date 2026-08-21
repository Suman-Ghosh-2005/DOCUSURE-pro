import {
  processMultiDocumentApplicationAI,
  processSingleDocumentAI,
  extractFieldsFromDocument,
  ProcessedExtractedField,
  SingleDocumentAIProcessingResult,
  ApplicationInputDocument,
  ApplicationMultiDocAIResult,
} from './extraction';
import { classifyDocumentText, ClassificationResult } from './classification';
import { DocumentSlotType } from '@/types/document.types';

export class AIService {
  /**
   * Free-Tier Optimization (Phase 4 Multi-Document Single-Request Architecture)
   * Processes ALL documents of an application in EXACTLY ONE Gemini API Request.
   */
  static async processApplicationMultiDoc(
    documents: ApplicationInputDocument[]
  ): Promise<ApplicationMultiDocAIResult> {
    return processMultiDocumentApplicationAI(documents);
  }

  static async processDocument(
    ocrText: string,
    slotTypeHint: DocumentSlotType
  ): Promise<SingleDocumentAIProcessingResult> {
    return processSingleDocumentAI(ocrText, slotTypeHint);
  }

  static async classifyDocument(
    ocrText: string,
    slotTypeHint: DocumentSlotType,
    originalFilename?: string
  ): Promise<ClassificationResult> {
    return classifyDocumentText(ocrText, slotTypeHint, originalFilename);
  }

  static async extractFields(
    ocrText: string,
    documentType: string
  ): Promise<ProcessedExtractedField[]> {
    return extractFieldsFromDocument(ocrText, documentType);
  }
}
