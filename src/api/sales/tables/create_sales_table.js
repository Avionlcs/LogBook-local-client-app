module.exports = {
    async create(pool) {
        await pool.query(`
     CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  public_id TEXT GENERATED ALWAYS AS (to_base36_upper(id)) STORED UNIQUE,

  seller_user_id UUID NOT NULL
    REFERENCES users(id) ON DELETE RESTRICT,
  customer_user_id UUID
    REFERENCES users(id) ON DELETE SET NULL,

  -- aggregates (kept for backward compatibility)
  card_payment_amount NUMERIC(12,2) DEFAULT 0,
  card_payment_reference TEXT,
  cash_payment_amount NUMERIC(12,2) DEFAULT 0,
  qr_payment_amount NUMERIC(12,2) DEFAULT 0,
  qr_payment_reference TEXT,

  loyalty_claimed_amount NUMERIC(12,2) DEFAULT 0,
  loyalty_reference TEXT,

  total_paid_amount NUMERIC(12,2) DEFAULT 0,
  total_offer_discount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,

  status TEXT NOT NULL
    CHECK (status IN ('sold','processing','paused','cancelled'))
    DEFAULT 'processing',

  payment_method TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
    `);
    }
};
