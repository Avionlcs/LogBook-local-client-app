module.exports = {
  async create(pool) {
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sales_public_id ON sales(public_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_items_item_id ON sale_items(item_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_items_sale_public_id ON sale_items(sale_public_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_offers_sale_public_id ON sale_offers(sale_public_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_offers_offer_code ON sale_offers(offer_code);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_public_id);`);
  }
};
