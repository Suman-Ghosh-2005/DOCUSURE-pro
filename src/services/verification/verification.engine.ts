import { runCrossDocumentVerification, VerificationEngineSummary } from './cross-document.engine';
import { DocumentRecord, ExtractedField } from '@/types/document.types';

export class VerificationEngine {
  static runVerification(
    applicationId: string,
    documents: DocumentRecord[],
    extractedFields: ExtractedField[]
  ): VerificationEngineSummary {
    return runCrossDocumentVerification(applicationId, documents, extractedFields);
  }
}

export * from './cross-document.engine';
export * from './normalizer';
