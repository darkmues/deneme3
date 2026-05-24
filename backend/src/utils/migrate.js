// ============================================================
// HAYAT API — Migration Runner
// Applies SQL files in migrations/ in filename order.
// Tracks applied files in a _migrations table (idempotent).
// ============================================================
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pool from '../models/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, '..', '..', 'migrations');

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename   VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const { rows } = await client.query('SELECT filename FROM _migrations');
    const applied = new Set(rows.map((r) => r.filename));

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[MIGRATE] ↷ skip ${file} (already applied)`);
        continue;
      }
      const sql = await readFile(join(migrationsDir, file), 'utf8');
      console.log(`[MIGRATE] ▶ applying ${file} ...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        count += 1;
        console.log(`[MIGRATE] ✓ ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration failed in ${file}: ${err.message}`);
      }
    }

    console.log(count === 0 ? '[MIGRATE] Nothing to apply — database up to date.' : `[MIGRATE] Done — ${count} migration(s) applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[MIGRATE] FAILED:', err.message);
  process.exit(1);
});
