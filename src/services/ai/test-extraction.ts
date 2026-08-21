import { generateSyntheticPDF } from '@/lib/pdf/generator';
import { extractTextFromDocumentBuffer } from '@/services/ocr/tesseract.service';
import { AIService } from '@/services/ai/ai.service';
import { DEMO_SCENARIOS, DemoScenarioId } from '@/lib/constants/demo-scenarios';

async function runPhase4ExtractionTest() {
  console.log('=== RUNNING PHASE 4 AI CLASSIFICATION & EXTRACTION TEST ===\n');
  const scenarioKeys = Object.keys(DEMO_SCENARIOS) as DemoScenarioId[];

  for (const key of scenarioKeys) {
    const scenario = DEMO_SCENARIOS[key];
    console.log(`\n====================================================`);
    console.log(` TESTING ${scenario.name} (${scenario.applicantName})`);
    console.log(` Expected Status: ${scenario.expectedStatus}`);
    console.log(`====================================================`);

    for (const docDef of scenario.documents) {
      console.log(`\n[Slot: ${docDef.slotType}] Generating PDF & Running OCR...`);
      const pdfBuffer = generateSyntheticPDF(docDef);
      const ocrResult = await extractTextFromDocumentBuffer(pdfBuffer, 'application/pdf');

      console.log(`  - OCR Word Count: ${ocrResult.word_count}`);
      console.log(`  - Running AI Classification...`);
      const classification = await AIService.classifyDocument(ocrResult.raw_text, docDef.slotType);

      console.log(`  - Classified Type: ${classification.document_type} (Conf: ${(classification.confidence * 100).toFixed(1)}%)`);
      if (classification.is_slot_mismatch) {
        console.log(`  - NOTICE: Slot Mismatch Flagged!`);
      }

      console.log(`  - Running AI Field Extraction...`);
      const fields = await AIService.extractFields(ocrResult.raw_text, classification.document_type);

      console.log(`  - Extracted Fields (${fields.length}):`);
      for (const field of fields) {
        console.log(
          `     * ${field.field_name}: raw="${field.raw_value}" | norm="${field.normalized_value}" | conf=${field.confidence.toFixed(2)} | evidenceVerified=${field.evidence_verified}`
        );
      }
    }
  }

  console.log('\n====================================================');
  console.log(' PHASE 4 AI EXTRACTION TEST COMPLETE');
  console.log('====================================================');
}

runPhase4ExtractionTest().catch(console.error);
