const fs = require('fs');
const path = require('path');
const db = require('./db');

// Applies the idempotent feature migrations on start, so the hosted database gets new
// tables and columns without running psql by hand. Every statement uses IF NOT EXISTS.
const AUTO_MIGRATIONS = [
  '2026-11-17-batch1-features.sql',
  '2026-11-17-batch2-features.sql',
  '2026-11-17-batch3-cancellation.sql',
  '2026-11-17-batch4-telegram.sql',
];

async function ensureSchema() {
  for (const file of AUTO_MIGRATIONS) {
    const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'db', 'migrations', file), 'utf8');
    try {
      await db.query(sql);
      console.log(`[schema] ${file} applied`);
    } catch (err) {
      console.error(`[schema] ${file} failed:`, err.message);
    }
  }
}

module.exports = { ensureSchema };
