const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://torflix:torflix_secret_2026@localhost:5432/torflix',
  max: 20,
  idleTimeoutMillis: 30000,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
  } finally {
    client.release();
  }
}

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, initDB, query };
