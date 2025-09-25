
// Idempotency cache table (scoped by sale)
const db = require("../../../../config/dbConfig");

async function ensure(p) {
  await p.query(`CREATE TABLE IF NOT EXISTS idempotency_cache(
    sale_public_id TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_idem UNIQUE(sale_public_id, idempotency_key)
  )`);
}

module.exports.find = async (id, key) => {
  const pool = db.getPool();
  await ensure(pool);
  const r = await pool.query(
    "SELECT response FROM idempotency_cache WHERE sale_public_id=$1 AND idempotency_key=$2",
    [id, key]
  );
  return r.rows[0]?.response || null;
};

module.exports.save = async (id, key, resp) => {
  const pool = db.getPool();
  await ensure(pool);
  await pool.query(
    "INSERT INTO idempotency_cache(sale_public_id, idempotency_key, response) VALUES($1, $2, $3) ON CONFLICT DO NOTHING",
    [id, key, resp]
  );
};
