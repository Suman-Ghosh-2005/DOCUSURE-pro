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

import { createAdminClient } from '@/lib/supabase/server';

async function checkProfilesTable() {
  const admin = createAdminClient();

  console.log('Checking public.profiles table...');
  const { data, error } = await admin.from('profiles').select('id, name, email, role').limit(10);

  if (error) {
    console.error('Error selecting from profiles table:', error);
  } else {
    console.log('Profiles table exists! Records:', data);
  }
}

checkProfilesTable().catch(console.error);
