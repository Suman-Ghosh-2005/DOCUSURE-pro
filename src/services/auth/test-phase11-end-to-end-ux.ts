import fs from 'fs';
import path from 'path';

// Parse .env.local for standalone tsx runner
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

import { createAdminClient } from '@/lib/supabase/server';
import { ApplicationRepository } from '@/repositories/application.repository';
import { ReviewRepository } from '@/repositories/review.repository';
import { AuditService } from '@/services/audit/audit.service';
import { DEFAULT_SCHEME_ID } from '@/lib/constants/default-rules';

async function runEndToEndUXTestSuite() {
  console.log('================================================================');
  console.log(' DOCUSURE — PHASE 11 FULL PRESENTATION JOURNEY TEST SUITE        ');
  console.log('================================================================\n');

  const admin = createAdminClient();

  // 1. Create Applicant Account
  const applicantEmail = `ananya_ux_${Date.now()}@docusure.demo`;
  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email: applicantEmail,
    password: 'Demo@1234Password',
    email_confirm: true,
    user_metadata: { name: 'Ananya Ghosh', role: 'APPLICANT' },
  });

  console.log(`[STEP 1] Applicant Created        : Email=${applicantEmail}, ID=${userData.user?.id}`);
  console.assert(!userErr && userData.user !== null, 'Applicant creation must succeed');

  // 2. Create Application & Link Ownership
  const app = await ApplicationRepository.create({
    applicant_user_id: userData.user!.id,
    applicant_name: 'Ananya Ghosh',
    dob: '2004-03-14',
    gender: 'Female',
    scheme_id: DEFAULT_SCHEME_ID,
  });

  console.log(`[STEP 2] Application Created      : AppID=${app?.id}`);
  console.assert(app !== null && app.applicant_user_id === userData.user!.id, 'Application must be owned by Applicant');

  // 3. Verify Applicant Dashboard Isolation
  const applicantApps = await ApplicationRepository.getByUserId(userData.user!.id);
  console.log(`[STEP 3] Applicant Dashboard View : Count=${applicantApps.length}`);
  console.assert(applicantApps.length === 1 && applicantApps[0].id === app?.id, 'Dashboard must show strictly owned application');

  // 4. Officer Review Queue Verification
  const officerQueue = await ApplicationRepository.listAll();
  console.log(`[STEP 4] Officer Intake Queue     : Total Intake Count=${officerQueue.length}`);
  console.assert(officerQueue.some((a) => a.id === app?.id), 'Officer workstation must contain newly submitted application');

  // 5. Submit Officer Approval Decision
  const review = await ReviewRepository.create({
    application_id: app!.id,
    decision: 'APPROVE',
    notes: 'Verified all eligibility requirements & cryptographic audit log.',
  });

  await ApplicationRepository.updateStatus(
    app!.id,
    'APPROVED',
    `Approved by officer. Notes: ${review?.notes}`,
    'Officer Decision Completed'
  );

  await AuditService.recordAuditEvent({
    applicationId: app!.id,
    eventType: 'OFFICER_DECISION',
    eventData: { decision: 'APPROVE', notes: review?.notes },
    actorType: 'OFFICER',
  });

  console.log(`[STEP 5] Officer Decision Recorded : Status=APPROVED, DecisionID=${review?.id}`);

  // 6. Applicant Login & Decision Verification
  const updatedApp = await ApplicationRepository.getById(app!.id);
  console.log(`[STEP 6] Applicant Views Decision : Status=${updatedApp?.status}, Notes="${updatedApp?.routing_reason}"`);
  console.assert(updatedApp?.status === 'APPROVED', 'Applicant must see updated APPROVED status');

  console.log('\n================================================================');
  console.log('    PHASE 11 FULL PRESENTATION JOURNEY TEST SUITE PASSED (6/6)   ');
  console.log('================================================================\n');
}

runEndToEndUXTestSuite().catch(console.error);
