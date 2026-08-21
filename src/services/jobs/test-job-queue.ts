import fs from 'fs';
import path from 'path';

// Parse .env.local manually for standalone tsx test scripts
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf-8');
  envConfig.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const val = valueParts.join('=').trim();
      if (key && val && !process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  });
}

import { generateSyntheticPDF } from '@/lib/pdf/generator';
import { extractTextFromDocumentBuffer } from '@/services/ocr/tesseract.service';
import { ApplicationRepository } from '@/repositories/application.repository';
import { DocumentRepository } from '@/repositories/document.repository';
import { JobRepository } from '@/repositories/job.repository';
import { processJobAsync } from '@/services/jobs/worker.service';
import { DEMO_SCENARIOS } from '@/lib/constants/demo-scenarios';
import { DEFAULT_SCHEME_ID } from '@/lib/constants/default-rules';
import { v4 as uuidv4 } from 'uuid';

async function runJobQueueIntegrationTest() {
  console.log('================================================================');
  console.log('    DOCUSURE — PHASE 8A ASYNCHRONOUS JOB QUEUE AUDIT           ');
  console.log('================================================================\n');

  // Test Scenario 1
  const scenario = DEMO_SCENARIOS.SCENARIO_1_VALID;
  console.log(`>>> Testing Asynchronous Processing Job Queue for ${scenario.name}...`);

  const application = await ApplicationRepository.create({
    applicant_name: scenario.applicantName,
    dob: scenario.dob,
    gender: scenario.gender,
    scheme_id: DEFAULT_SCHEME_ID,
  });

  if (!application) throw new Error('Failed to create application record');

  for (const docDef of scenario.documents) {
    const pdfBuffer = generateSyntheticPDF(docDef);
    const ocrResult = await extractTextFromDocumentBuffer(pdfBuffer, 'application/pdf');

    const created = await DocumentRepository.create({
      application_id: application.id,
      slot_type: docDef.slotType,
      storage_path: `${application.id}/${uuidv4()}.pdf`,
      original_filename: `${docDef.slotType.toLowerCase()}_synthetic.pdf`,
      mime_type: 'application/pdf',
      file_size_bytes: pdfBuffer.length,
    });

    if (created) {
      await DocumentRepository.updateOCRResult(created.id, ocrResult.raw_text, ocrResult.ocr_confidence);
    }
  }

  // 1. Create Processing Job
  const job = await JobRepository.create(application.id);
  if (!job) throw new Error('Failed to create processing job record');

  console.log(`  └─ Job Created      : ID=${job.id}, Status=${job.status}, Stage=${job.current_stage}`);
  console.assert(job.status === 'QUEUED', 'Initial job status must be QUEUED');

  // 2. Launch Worker Asynchronously
  await processJobAsync(job.id);

  // 3. Poll Job Status Until Completed (or max 15s)
  let finalJob = job;
  const startTime = Date.now();

  while (Date.now() - startTime < 15000) {
    await new Promise((r) => setTimeout(r, 500));
    const polled = await JobRepository.getById(job.id);
    if (polled) {
      finalJob = polled;
      if (polled.status === 'COMPLETED' || polled.status === 'FAILED') {
        break;
      }
    }
  }

  console.log(`  └─ Worker Result    : Status=${finalJob.status}, FinalStage=${finalJob.current_stage}`);
  console.assert(finalJob.status === 'COMPLETED', 'Job status must be COMPLETED');

  // Fetch updated application status
  const updatedApp = await ApplicationRepository.getById(application.id);
  console.log(`  └─ Application Result: Status=${updatedApp?.status}, RoutingReason=${updatedApp?.routing_reason}`);

  console.log('\n================================================================');
  console.log('        PHASE 8A ASYNCHRONOUS JOB QUEUE AUDIT PASSED           ');
  console.log('================================================================\n');
}

runJobQueueIntegrationTest().catch(console.error);
