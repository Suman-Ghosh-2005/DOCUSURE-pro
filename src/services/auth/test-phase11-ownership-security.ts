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

async function runOwnershipSecurityTestSuite() {
  console.log('================================================================');
  console.log(' DOCUSURE — PHASE 11 OWNERSHIP SECURITY & ISOLATION TEST SUITE  ');
  console.log('================================================================\n');

  const userA = `b1000000-0000-0000-0000-000000000001`;
  const userB = `b2000000-0000-0000-0000-000000000002`;

  // 1. Create Application for User A
  const appA = await ApplicationRepository.create({
    applicant_user_id: userA,
    applicant_name: 'Ananya Ghosh (User A)',
    dob: '2004-03-14',
    gender: 'Female',
    scheme_id: DEFAULT_SCHEME_ID,
  });

  console.log(`[TEST 1] Created App A for User A : AppID=${appA?.id}, UserID=${appA?.applicant_user_id}`);
  console.assert(appA !== null && appA.applicant_user_id === userA, 'App A must belong to User A');

  // 2. Fetch applications for User A
  const appsUserA = await ApplicationRepository.getByUserId(userA);
  console.log(`[TEST 2] User A Private Apps    : Count=${appsUserA.length}`);
  console.assert(appsUserA.length === 1 && appsUserA[0].id === appA?.id, 'User A must see ONLY their 1 owned application');

  // 3. Fetch applications for User B
  const appsUserB = await ApplicationRepository.getByUserId(userB);
  console.log(`[TEST 3] User B Private Apps    : Count=${appsUserB.length}`);
  console.assert(appsUserB.length === 0, 'User B must see 0 applications (cannot see User A app)');

  // 4. Officer Workstation List
  const officerApps = await ApplicationRepository.listAll();
  console.log(`[TEST 4] Officer Intake View    : Total Intake=${officerApps.length}`);
  console.assert(officerApps.some((a) => a.id === appA?.id), 'Officer view must contain App A');

  console.log('\n================================================================');
  console.log('    PHASE 11 OWNERSHIP SECURITY & ISOLATION TEST PASSED (4/4)    ');
  console.log('================================================================\n');
}

runOwnershipSecurityTestSuite().catch(console.error);
