import { generateSyntheticPDF } from '@/lib/pdf/generator';
import { extractTextFromDocumentBuffer } from '@/services/ocr/tesseract.service';
import { DEMO_SCENARIOS } from '@/lib/constants/demo-scenarios';

async function runOCRVerificationTest() {
  console.log('=== RUNNING PHASE 3 OCR EXTRACTION VERIFICATION TEST ===\n');
  const validScenario = DEMO_SCENARIOS.SCENARIO_1_VALID;

  for (const docDef of validScenario.documents) {
    console.log(`Processing Slot: ${docDef.slotType} (${docDef.title})...`);
    const pdfBuffer = generateSyntheticPDF(docDef);
    const result = await extractTextFromDocumentBuffer(pdfBuffer, 'application/pdf');

    console.log(`  - Page Count: ${result.page_count}`);
    console.log(`  - Word Count: ${result.word_count}`);
    console.log(`  - OCR Confidence: ${result.ocr_confidence.toFixed(3)} (${(result.ocr_confidence * 100).toFixed(1)}%)`);
    console.log(`  - Text Sample: "${result.raw_text.slice(0, 120).replace(/\n/g, ' ')}..."`);
    console.log('----------------------------------------------------');
  }

  console.log('\n=== OCR VERIFICATION TEST COMPLETE ===');
}

runOCRVerificationTest().catch(console.error);
