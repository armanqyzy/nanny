const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Hosted Postgres drops idle connections; keep them alive and fail fast instead of hanging.
  keepAlive: true,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Postgres pool error:', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
