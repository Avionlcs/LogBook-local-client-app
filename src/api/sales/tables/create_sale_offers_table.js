module.exports = {
  async create(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_offers (
        id SERIAL PRIMARY KEY,
        public_id TEXT GENERATED ALWAYS AS (to_base36_upper(id)) STORED UNIQUE,
        sale_public_id TEXT NOT NULL
          REFERENCES sales(public_id) ON DELETE CASCADE,
        offer_code TEXT NOT NULL,
        offer_description TEXT,
        discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }
};
