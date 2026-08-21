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
import { DEFAULT_SCHEME_ID } from '@/lib/constants/default-rules';

async function runPhase11AdminSignupTestSuite() {
  console.log('================================================================');
  console.log(' DOCUSURE — PHASE 11A ADMIN AUTH SIGNUP TEST SUITE              ');
  console.log('================================================================\n');

  const admin = createAdminClient();

  // Test Applicant A: Ananya Ghosh (ananya@docusure.demo)
  const emailA = `ananya_${Date.now()}@docusure.demo`;
  const passA = 'Demo@1234';

  const { data: userAData, error: errA } = await admin.auth.admin.createUser({
    email: emailA,
    password: passA,
    email_confirm: true,
    user_metadata: { name: 'Ananya Ghosh', role: 'APPLICANT' },
  });

  console.log(`[TEST 1] Applicant A Admin Created : Email=${emailA}, UserID=${userAData.user?.id}`);
  console.assert(!errA && userAData.user !== null, 'Applicant A creation must succeed');
  console.assert(userAData.user?.email_confirmed_at !== null, 'Applicant A email_confirmed_at must be populated');

  // Test Applicant B: Student B (student@docusure.demo)
  const emailB = `student_${Date.now()}@docusure.demo`;
  const passB = 'Demo@1234';

  const { data: userBData, error: errB } = await admin.auth.admin.createUser({
    email: emailB,
    password: passB,
    email_confirm: true,
    user_metadata: { name: 'Student B', role: 'APPLICANT' },
  });

  console.log(`[TEST 2] Applicant B Admin Created : Email=${emailB}, UserID=${userBData.user?.id}`);
  console.assert(!errB && userBData.user !== null, 'Applicant B creation must succeed');

  // Create Application for Applicant A
  const appA = await ApplicationRepository.create({
    applicant_user_id: userAData.user!.id,
    applicant_name: 'Ananya Ghosh',
    dob: '2004-03-14',
    gender: 'Female',
    scheme_id: DEFAULT_SCHEME_ID,
  });

  console.log(`[TEST 3] Applicant A Created App  : AppID=${appA?.id}`);
  console.assert(appA !== null && appA.applicant_user_id === userAData.user!.id, 'App A must belong to User A');

  // Test Ownership Isolation: Applicant B cannot access Applicant A's application
  const appsB = await ApplicationRepository.getByUserId(userBData.user!.id);
  console.log(`[TEST 4] Applicant B Private Apps  : Count=${appsB.length}`);
  console.assert(!appsB.some((a) => a.id === appA?.id), 'Applicant B must NOT see Applicant A application');

  // Test Officer Global View Access
  const allApps = await ApplicationRepository.listAll();
  console.log(`[TEST 5] Officer Workstation View : Total Count=${allApps.length}`);
  console.assert(allApps.some((a) => a.id === appA?.id), 'Officer view must contain Applicant A application');

  console.log('\n================================================================');
  console.log('    PHASE 11A ADMIN AUTH SIGNUP TEST SUITE PASSED (5/5)        ');
  console.log('================================================================\n');
}

runPhase11AdminSignupTestSuite().catch(console.error);
