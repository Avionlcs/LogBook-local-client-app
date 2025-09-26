async function lockByPublicId(client, publicId) {
  const res = await client.query(
    'SELECT * FROM sales WHERE public_id = $1 FOR UPDATE',
    [publicId]
  );
  return res.rows[0] || null;
}

async function getSaleItems(client, publicId) {
  const res = await client.query(
    'SELECT * FROM sale_items WHERE sale_public_id = $1',
    [publicId]
  );
  return res.rows;
}

async function calculateItemTotal(client, publicId) {
  const res = await client.query(
    'SELECT COALESCE(SUM(total_price), 0)::NUMERIC(12,2) as "totalAmount" FROM sale_items WHERE sale_public_id = $1',
    [publicId]
  );
  return res.rows[0];
}

async function finalize(client, saleId, totalPaid, totalAmount) {
  const res = await client.query(
    `UPDATE sales SET status = 'sold', total_paid_amount = $1, total_amount = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [totalPaid, totalAmount, saleId]
  );
  return res.rows[0];
}

module.exports = { lockByPublicId, getSaleItems, calculateItemTotal, finalize };
