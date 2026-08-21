import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function executeMigration() {
  const password = process.argv[2] || 'G#0$#@suman2005';
  const projectRef = 'cgeelutqwpevmfiigori';
  const host = 'aws-0-ap-south-1.pooler.supabase.com';
  const port = 6543;
  const user = `postgres.${projectRef}`;

  console.log(`Connecting to Supabase PostgreSQL at ${user}@${host}:${port}...`);
  const client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Connected to remote Supabase database successfully!');

    // 1. Read & Execute Migration SQL
    const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260821030000_profiles_and_auth_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('\n--- EXECUTING MIGRATION 20260821030000_profiles_and_auth_schema.sql ---');
    await client.query(sql);
    console.log('✅ Migration applied successfully to remote database!');

    // 2. Verification Query 1: SELECT id, name, email, role FROM public.profiles LIMIT 10;
    console.log('\n--- VERIFICATION QUERY 1: SELECT id, name, email, role FROM public.profiles LIMIT 10 ---');
    const ver1 = await client.query('SELECT id, name, email, role FROM public.profiles LIMIT 10;');
    console.table(ver1.rows);

    // 3. Verification Query 2: SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles';
    console.log('\n--- VERIFICATION QUERY 2: SELECT column_name FROM information_schema.columns WHERE table_schema = \'public\' AND table_name = \'profiles\' ---');
    const ver2 = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profiles'
      ORDER BY ordinal_position;
    `);
    console.table(ver2.rows);

  } catch (err: unknown) {
    console.error('❌ Migration Error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

executeMigration().catch(console.error);
