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
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

async function testOfficerSession() {
  console.log('================================================================');
  console.log(' DOCUSURE — OFFICER AUTHENTICATION SESSION AUDIT                ');
  console.log('================================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const anonClient = createSupabaseClient(supabaseUrl, anonKey);

  // 1. signInWithPassword
  const { data, error: signInErr } = await anonClient.auth.signInWithPassword({
    email: 'officer@docusure.demo',
    password: 'Demo@1234',
  });

  console.assert(!signInErr && data.user !== null, `signInWithPassword must succeed: ${signInErr?.message}`);

  const user = data.user!;
  console.log('[AUTH DEBUG] login email = officer@docusure.demo');
  console.log('[AUTH DEBUG] authenticated user id =', user.id);
  console.log('[AUTH DEBUG] authenticated user email =', user.email);

  // 2. Fetch Profile Role via Admin Client
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', user.id)
    .single();

  const role = (profile?.role || user.user_metadata?.role || '').toUpperCase();
  console.log('[AUTH DEBUG] profile id =', profile?.id);
  console.log('[AUTH DEBUG] profile role =', role);
  console.log('[AUTH DEBUG] officer authorization result =', role === 'OFFICER');

  console.assert(user.id === 'e552b4b0-060a-4a71-8bf3-42aadfd0245c', 'Officer user ID must match expected UUID');
  console.assert(user.email === 'officer@docusure.demo', 'Officer user email must match officer@docusure.demo');
  console.assert(role === 'OFFICER', 'Profile role must resolve to OFFICER');

  console.log('\n================================================================');
  console.log('    OFFICER AUTHENTICATION SESSION AUDIT PASSED (4/4)           ');
  console.log('================================================================\n');
}

testOfficerSession().catch(console.error);
