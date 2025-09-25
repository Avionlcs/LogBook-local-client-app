module.exports = {
  async create(pool) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        public_id TEXT GENERATED ALWAYS AS (to_base36_upper(id)) STORED UNIQUE,
        sale_public_id TEXT NOT NULL
          REFERENCES sales(public_id) ON DELETE CASCADE,
        item_id UUID NOT NULL
          REFERENCES inventory_items(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(12,2) NOT NULL,
        total_price NUMERIC(12,2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }
};
