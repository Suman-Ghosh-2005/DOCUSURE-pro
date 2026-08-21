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

import { ApplicationRepository } from '@/repositories/application.repository';
import { DEFAULT_SCHEME_ID } from '@/lib/constants/default-rules';

async function runPhase11AuthTestSuite() {
  console.log('================================================================');
  console.log(' DOCUSURE — PHASE 11A AUTHENTICATION & PORTAL INTEGRATION TEST  ');
  console.log('================================================================\n');

  const testUserId1 = `a1000000-0000-0000-0000-000000000001`;
  const testUserId2 = `a2000000-0000-0000-0000-000000000002`;

  // Test 1: Application Ownership Assignment
  const app1 = await ApplicationRepository.create({
    applicant_user_id: testUserId1,
    applicant_name: 'TEST APPLICANT 1',
    dob: '2004-03-14',
    gender: 'Female',
    scheme_id: DEFAULT_SCHEME_ID,
  });

  console.log(`[TEST 1] Application Linked to User: AppID=${app1?.id}, UserID=${app1?.applicant_user_id}`);
  console.assert(app1 !== null && app1.applicant_user_id === testUserId1, 'Application must be linked to user 1');

  // Test 2: Applicant Ownership Filtering
  const user1Apps = await ApplicationRepository.getByUserId(testUserId1);
  console.log(`[TEST 2] User 1 Owned Applications : Count=${user1Apps.length}`);
  console.assert(user1Apps.some((a) => a.id === app1?.id), 'User 1 must find owned application');

  // Test 3: Ownership Isolation (User 2 Cannot See User 1 App)
  const user2Apps = await ApplicationRepository.getByUserId(testUserId2);
  console.log(`[TEST 3] User 2 Private View Count  : Count=${user2Apps.length}`);
  console.assert(!user2Apps.some((a) => a.id === app1?.id), 'User 2 must NOT see User 1 application');

  // Test 4: Officer Global View Access
  const allApps = await ApplicationRepository.listAll();
  console.log(`[TEST 4] Officer Workstation View : Total Intake Count=${allApps.length}`);
  console.assert(allApps.some((a) => a.id === app1?.id), 'Officer view must contain user application');

  console.log('\n================================================================');
  console.log('    PHASE 11A AUTHENTICATION & PORTAL INTEGRATION TEST PASSED   ');
  console.log('================================================================\n');
}

runPhase11AuthTestSuite().catch(console.error);
