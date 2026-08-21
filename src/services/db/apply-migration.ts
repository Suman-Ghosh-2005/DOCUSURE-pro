import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

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

async function runMigration() {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260821030000_profiles_and_auth_schema.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('--- MIGRATION CONTENT TO APPLY ---');
  console.log(sql);
  console.log('-----------------------------------');

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!dbUrl) {
    throw new Error(
      'DATABASE_URL or POSTGRES_URL must be set in the environment.'
    );
  }

  console.log('Connecting to Postgres...');

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to Postgres! Executing SQL migration...');
    await client.query(sql);
    console.log('MIGRATION APPLIED SUCCESSFULLY!');
  } catch (err) {
    console.error('Postgres direct connection error:', err);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

runMigration().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});