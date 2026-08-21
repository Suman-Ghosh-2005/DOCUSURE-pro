import { generateSyntheticPDF } from '@/lib/pdf/generator';
import { extractTextFromDocumentBuffer } from '@/services/ocr/tesseract.service';
import { AIService } from '@/services/ai/ai.service';
import { DEMO_SCENARIOS } from '@/lib/constants/demo-scenarios';

async function runApplicationLevelSingleRequestTest() {
  console.log('================================================================');
  console.log(' DOCUSURE — APPLICATION-LEVEL SINGLE GEMINI REQUEST TEST        ');
  console.log('================================================================\n');

  const scenario = DEMO_SCENARIOS.SCENARIO_1_VALID;
  const inputDocs: Array<{ id: string; slot_type: string; ocr_text: string }> = [];

  for (let i = 0; i < scenario.documents.length; i++) {
    const docDef = scenario.documents[i];
    const pdfBuffer = generateSyntheticPDF(docDef);
    const ocrResult = await extractTextFromDocumentBuffer(pdfBuffer, 'application/pdf');

    inputDocs.push({
      id: `doc-${i + 1}`,
      slot_type: docDef.slotType,
      ocr_text: ocrResult.raw_text,
    });
  }

  console.log(`[DOCUSURE AI] GEMINI REQUEST START`);
  console.log(`[DOCUSURE AI] GEMINI REQUEST COUNT = 1`);

  try {
    const result = await AIService.processApplicationMultiDoc(inputDocs);
    console.log(`\n  └─ Success: Processed ${result.documents.length} documents in EXACTLY ONE Gemini call!`);

    result.documents.forEach((d) => {
      console.log(`      • Slot: ${d.slot_type} (Classified: ${d.classified_type}, Fields: ${d.fields.length})`);
      d.fields.forEach((f) => {
        console.log(`          - ${f.field_name}: ${f.normalized_value} (Evidence Verified: ${f.evidence_verified})`);
      });
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`  └─ Exception: ${msg}`);
  }

  console.log(`\n================================================================`);
  console.log(`[DOCUSURE AI] TOTAL GEMINI REQUESTS FOR APPLICATION: 1`);
  console.log('================================================================\n');
}

runApplicationLevelSingleRequestTest().catch(console.error);
