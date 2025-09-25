module.exports = {
  async create(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS idempotency_cache (
        key TEXT PRIMARY KEY,
        response_body JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_payments (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL,
        CONSTRAINT fk_sale_payments_sale_id
          FOREIGN KEY (sale_id)
          REFERENCES sales(id)
          ON DELETE CASCADE,
        method TEXT NOT NULL CHECK (method IN ('cash', 'card', 'qr')),
        amount NUMERIC(12, 2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'LKR',
        reference TEXT,
        meta JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id);`);
  },
};
