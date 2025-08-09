module.exports = {
    async create(pool) {
        await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        seller_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT DEFAULT '00000000-0000-0000-0000-000000000000',
        
        card_payment_amount NUMERIC(12, 2) DEFAULT 0,
        card_payment_reference TEXT,
        
        cash_payment_amount NUMERIC(12, 2) DEFAULT 0,
        
        qr_payment_amount NUMERIC(12, 2) DEFAULT 0,
        qr_payment_reference TEXT,
        
        loyalty_claimed_amount NUMERIC(12, 2) DEFAULT 0,
        loyalty_reference TEXT,
        
        total_paid_amount NUMERIC(12, 2) DEFAULT 0,
        total_offer_discount NUMERIC(12, 2) DEFAULT 0,
        
        total_amount NUMERIC(12, 2) DEFAULT 0,
        status TEXT NOT NULL CHECK (status IN ('sold', 'processing', 'paused', 'cancelled')) DEFAULT 'processing',
        
        payment_method TEXT,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

        // sale_items with serial PK, foreign key sale_id references sales(id) integer
        await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(12, 2) NOT NULL,
        total_price NUMERIC(12, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
        await pool.query(`
      CREATE TABLE IF NOT EXISTS sale_offers (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        offer_code TEXT NOT NULL,
        offer_description TEXT,
        discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_user_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_user_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_items_item_id ON sale_items(item_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_offers_sale_id ON sale_offers(sale_id);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_offers_offer_code ON sale_offers(offer_code);`);
    }
};
