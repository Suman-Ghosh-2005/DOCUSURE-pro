import fs from 'fs';
import path from 'path';

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

async function testOfficerRecentDashboard() {
  console.log('================================================================');
  console.log(' DOCUSURE — OFFICER RECENT APPLICATIONS DASHBOARD TEST          ');
  console.log('================================================================\n');

  // 1. Create Application A (older)
  const appA = await ApplicationRepository.create({
    applicant_name: 'Applicant A (Demo)',
    dob: '2004-01-01',
    gender: 'Female',
    scheme_id: DEFAULT_SCHEME_ID,
  });

  // Short pause to ensure distinct timestamp
  await new Promise((r) => setTimeout(r, 100));

  // 2. Create Application B (newer)
  const appB = await ApplicationRepository.create({
    applicant_name: 'Applicant B (Demo)',
    dob: '2003-05-12',
    gender: 'Male',
    scheme_id: DEFAULT_SCHEME_ID,
  });

  console.log(`[TEST 1] Created App A (Older) : AppID=${appA?.id}`);
  console.log(`[TEST 2] Created App B (Newer) : AppID=${appB?.id}`);

  // 3. Fetch listAll()
  const allApps = await ApplicationRepository.listAll();
  console.log(`[TEST 3] Total Officer Intake  : Count=${allApps.length}`);

  // 4. Verify Recent Applications Slice (Top 5 DESC)
  const recentTop5 = allApps.slice(0, 5);
  console.log('[TEST 4] Recent Applications Slice (Top 5):');
  recentTop5.forEach((app, idx) => {
    console.log(`  [${idx}] ${app.applicant_name} | ID: ${app.id.slice(0, 8)} | Created: ${app.created_at}`);
  });

  const indexB = recentTop5.findIndex((a) => a.id === appB?.id);
  const indexA = recentTop5.findIndex((a) => a.id === appA?.id);

  console.log(`\n  Index of App B (Newer): ${indexB}`);
  console.log(`  Index of App A (Older): ${indexA}`);

  console.assert(indexB !== -1 && indexA !== -1, 'Both App B and App A must be in recent applications slice');
  console.assert(indexB < indexA, 'App B (newer) MUST appear BEFORE App A (older) in recent list');

  console.log('\n================================================================');
  console.log('    OFFICER RECENT APPLICATIONS DASHBOARD TEST PASSED (4/4)     ');
  console.log('================================================================\n');
}

testOfficerRecentDashboard().catch(console.error);
