// sale_payments.js
module.exports = {
  async create(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_payments (
        id SERIAL PRIMARY KEY,
        sale_public_id TEXT NOT NULL
          REFERENCES sales(public_id) ON DELETE CASCADE,
        method TEXT NOT NULL CHECK(method IN ('cash','card','qr')),
        amount NUMERIC(12,2) NOT NULL,
        currency TEXT NOT NULL DEFAULT 'LKR',
        reference TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_public_id);`
    );
  },
};
