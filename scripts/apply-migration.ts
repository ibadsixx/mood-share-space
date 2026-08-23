/**
 * Apply a SINGLE SQL migration against a configured SQL execution endpoint.
 *
 * Provider-neutral: everything is read from environment variables.
 *
 * Usage:
 *   MIGRATION_SQL_ENDPOINT="https://..." \
 *   MIGRATION_ACCESS_TOKEN="..." \
 *   npx tsx scripts/apply-migration.ts <migration-file>.sql
 *
 * Optional:
 *   MIGRATION_PROJECT_REF — required when MIGRATION_SQL_ENDPOINT contains {ref}.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ENDPOINT_TEMPLATE = process.env.MIGRATION_SQL_ENDPOINT;
const PROJECT_REF = process.env.MIGRATION_PROJECT_REF ?? '';
const ACCESS_TOKEN = process.env.MIGRATION_ACCESS_TOKEN;

if (!ENDPOINT_TEMPLATE) {
  console.error('Missing MIGRATION_SQL_ENDPOINT');
  console.error('Set it to the HTTP endpoint that executes SQL (POST { query }); use {ref} for the project ref placeholder.');
  process.exit(1);
}

if (ENDPOINT_TEMPLATE.includes('{ref}') && !PROJECT_REF) {
  console.error('MIGRATION_SQL_ENDPOINT contains {ref} but MIGRATION_PROJECT_REF is not set.');
  process.exit(1);
}

if (!ACCESS_TOKEN) {
  console.error('Missing MIGRATION_ACCESS_TOKEN');
  console.error('Export a token authorized to run SQL against the target database.');
  process.exit(1);
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: npx tsx scripts/apply-migration.ts <migration-file>.sql');
  process.exit(1);
}

const filePath = resolve(process.cwd(), 'supabase', 'migrations', migrationFile);

let sql = '';
try {
  sql = readFileSync(filePath, 'utf-8').trim();
} catch {
  console.error(`Cannot read migration file: ${filePath}`);
  process.exit(1);
}

if (!sql) {
  console.error(`${migrationFile} is empty.`);
  process.exit(1);
}

async function main() {
  console.log(`Applying migration: ${migrationFile}`);

  const response = await fetch(
    ENDPOINT_TEMPLATE!.replace('{ref}', encodeURIComponent(PROJECT_REF)),
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL failed (${response.status}): ${text}`);
  }

  console.log('Migration applied successfully!');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Migration failed:', message.split('\n')[0]);
  console.error('\nApply the SQL manually in any database console authorized for this project:');
  console.log(`\n--- SQL for ${migrationFile} ---`);
  console.log(sql);
  console.log('--- end ---');
  process.exit(1);
});
