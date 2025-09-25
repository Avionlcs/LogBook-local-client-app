module.exports={async create(pool){
await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
await pool.query(`CREATE TABLE IF NOT EXISTS inventory_items(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),name TEXT NOT NULL,stock INTEGER DEFAULT 0,min_stock INTEGER DEFAULT 0,buy_price NUMERIC(12,2) DEFAULT 0,sale_price NUMERIC(12,2) DEFAULT 0,barcode TEXT,hash TEXT UNIQUE,sold INTEGER DEFAULT 0,created_at TIMESTAMP DEFAULT NOW(),updated_at TIMESTAMP DEFAULT NOW());`);
await pool.query(`CREATE TABLE IF NOT EXISTS inventory_item_metadata(item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,field_name TEXT NOT NULL,field_value TEXT,PRIMARY KEY(item_id,field_name));`);
await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_name ON inventory_items(name);`);
await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory_items(barcode);`);
await pool.query(`CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory_items(stock);`);
await pool.query(`CREATE INDEX IF NOT EXISTS idx_metadata_field_name ON inventory_item_metadata(field_name);`);
await pool.query(`CREATE INDEX IF NOT EXISTS idx_metadata_field_value ON inventory_item_metadata(field_value);`);
}};
