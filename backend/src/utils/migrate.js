// ============================================================
// HAYAT API — Database Migration Runner
// Usage: npm run migrate
// ============================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import config from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

const pool = new pg.Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
});

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations(client) {
  const result = await client.query('SELECT filename FROM _migrations ORDER BY id');
  return new Set(result.rows.map(r => r.filename));
}

async function migrate() {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const executed = await getExecutedMigrations(client);

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let count = 0;

    for (const file of files) {
      if (executed.has(file)) {
        console.log(`  ⏭️  ${file} (zaten uygulanmış)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

      console.log(`  ▶️  ${file} uygulanıyor...`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`  ✅ ${file} tamamlandı`);
        count++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ❌ ${file} hata:`, error.message);
        throw error;
      }
    }

    if (count === 0) {
      console.log('\n  Tüm migration\'lar güncel.');
    } else {
      console.log(`\n  ${count} migration uygulandı.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

console.log('\n🗄️  HAYAT — Migration Runner\n');
migrate()
  .then(() => {
    console.log('\n✅ Migration tamamlandı.\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Migration başarısız:', err.message, '\n');
    process.exit(1);
  });
