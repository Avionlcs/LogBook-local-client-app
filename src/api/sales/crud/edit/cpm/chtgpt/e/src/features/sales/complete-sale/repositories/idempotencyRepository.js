const { getPool } = require('../../../config/dbConfig');

async function findByKey(key) {
  const pool = getPool();
  const res = await pool.query(
    'SELECT response_body FROM idempotency_cache WHERE key = $1',
    [key]
  );
  return res.rows[0] ? JSON.parse(res.rows[0].response_body) : null;
}

async function save(key, response) {
  const pool = getPool();
  // Using a separate client to not interfere with any ongoing transaction
  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO idempotency_cache (key, response_body) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING',
      [key, JSON.stringify(response)]
    );
  } finally {
    client.release();
  }
}

module.exports = { findByKey, save };
