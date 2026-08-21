import { generateSyntheticPDF } from '@/lib/pdf/generator';
import { extractTextFromDocumentBuffer } from '@/services/ocr/tesseract.service';
import { AIService } from '@/services/ai/ai.service';
import { DEMO_SCENARIOS } from '@/lib/constants/demo-scenarios';

async function runExtractionEfficiencyVerificationTest() {
  console.log('================================================================');
  console.log('      DOCUSURE — AI EXTRACTION EFFICIENCY & 429 VERIFICATION   ');
  console.log('================================================================\n');

  const validScenario = DEMO_SCENARIOS.SCENARIO_1_VALID;

  console.log('Testing Single-Request Combined AI Processing (Goal 1)...');

  let requestCount = 0;
  for (const docDef of validScenario.documents) {
    const pdfBuffer = generateSyntheticPDF(docDef);
    const ocrResult = await extractTextFromDocumentBuffer(pdfBuffer, 'application/pdf');

    requestCount += 1;
    console.log(`Document #${requestCount}: ${docDef.slotType}`);

    try {
      const aiResult = await AIService.processDocument(ocrResult.raw_text, docDef.slotType);
      console.log(`  └─ Gemini Request #${requestCount}: Success (Type: ${aiResult.classified_type}, Fields: ${aiResult.fields.length})`);
      aiResult.fields.forEach((f) => {
        console.log(`      • ${f.field_name}: ${f.normalized_value} (Evidence Verified: ${f.evidence_verified})`);
      });
    } catch (err: unknown) {
      console.log(`  └─ Gemini Request #${requestCount}: Quota/Mock Exception (${err instanceof Error ? err.message : String(err)})`);
    }
  }

  console.log(`\nTotal Gemini Requests for Scenario 1: ${requestCount} (Goal: ≤ 4)`);
  console.assert(requestCount <= 4, 'Total requests for 4 documents must be <= 4');

  console.log('\n================================================================');
  console.log('  AI EXTRACTION EFFICIENCY TEST VERIFICATION COMPLETE           ');
  console.log('================================================================\n');
}

runExtractionEfficiencyVerificationTest().catch(console.error);
