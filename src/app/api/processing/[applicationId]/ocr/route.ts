import { NextResponse } from 'next/server';
import { ApplicationRepository } from '@/repositories/application.repository';
import { DocumentRepository } from '@/repositories/document.repository';
import { extractTextFromDocumentBuffer } from '@/services/ocr/tesseract.service';
import { createAdminClient } from '@/lib/supabase/server';
import { DEMO_SCENARIOS, DemoScenarioId } from '@/lib/constants/demo-scenarios';
import { generateSyntheticPDF } from '@/lib/pdf/generator';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;
    const application = await ApplicationRepository.getById(applicationId);

    if (!application) {
      return NextResponse.json(
        { data: null, error: { message: 'Application not found', code: 'NOT_FOUND' } },
        { status: 404 }
      );
    }

    const documents = await DocumentRepository.getByApplicationId(applicationId);

    if (!documents.length) {
      return NextResponse.json(
        { data: null, error: { message: 'No documents found for this application', code: 'NO_DOCUMENTS' } },
        { status: 400 }
      );
    }

    // Update processing stage
    await ApplicationRepository.updateStatus(applicationId, 'PROCESSING', undefined, 'Running OCR Extraction');

    const supabaseAdmin = createAdminClient();
    const processedSummary: Array<{
      document_id: string;
      slot_type: string;
      status: string;
      word_count: number;
      ocr_confidence: number;
      text_snippet: string;
    }> = [];

    // Process documents sequentially
    for (const doc of documents) {
      await DocumentRepository.updateStatus(doc.id, 'PROCESSING');
      let fileBuffer: Buffer | null = null;

      // Try fetching file buffer from Supabase Storage
      if (doc.storage_path) {
        const { data: downloadData, error: downloadError } = await supabaseAdmin.storage
          .from('docusure-documents')
          .download(doc.storage_path);

        if (!downloadError && downloadData) {
          const arrayBuffer = await downloadData.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuffer);
        }
      }

      // Fallback generator for synthetic demo documents if storage is not connected locally
      if (!fileBuffer) {
        const matchingScenario = Object.values(DEMO_SCENARIOS).find(
          (s) => s.applicantName === application.applicant_name
        );

        if (matchingScenario) {
          const docDef = matchingScenario.documents.find((d) => d.slotType === doc.slot_type);
          if (docDef) {
            fileBuffer = generateSyntheticPDF(docDef);
          }
        }
      }

      if (!fileBuffer) {
        await DocumentRepository.updateStatus(doc.id, 'FAILED');
        processedSummary.push({
          document_id: doc.id,
          slot_type: doc.slot_type,
          status: 'FAILED',
          word_count: 0,
          ocr_confidence: 0.0,
          text_snippet: '',
        });
        continue;
      }

      // Run Server-Side OCR Engine
      const ocrResult = await extractTextFromDocumentBuffer(
        fileBuffer,
        doc.mime_type || 'application/pdf'
      );

      // Save to Database
      await DocumentRepository.updateOCRResult(
        doc.id,
        ocrResult.raw_text,
        ocrResult.ocr_confidence
      );

      processedSummary.push({
        document_id: doc.id,
        slot_type: doc.slot_type,
        status: 'OCR_COMPLETE',
        word_count: ocrResult.word_count,
        ocr_confidence: ocrResult.ocr_confidence,
        text_snippet: ocrResult.raw_text.slice(0, 100).replace(/\n/g, ' '),
      });
    }

    await ApplicationRepository.updateStatus(applicationId, 'PROCESSING', undefined, 'OCR Extraction Complete');

    return NextResponse.json({
      data: {
        application_id: applicationId,
        documents_processed: processedSummary.length,
        summary: processedSummary,
      },
      error: null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'OCR processing pipeline error';
    console.error('[OCR Processing Route Error]:', error);
    return NextResponse.json(
      { data: null, error: { message, code: 'OCR_PIPELINE_ERROR' } },
      { status: 500 }
    );
  }
}
