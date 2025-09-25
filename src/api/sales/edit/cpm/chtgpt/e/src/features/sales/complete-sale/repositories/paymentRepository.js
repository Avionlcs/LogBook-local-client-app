async function insertMany(client, saleId, payments) {
  const insertPromises = payments.map((p) => {
    const query = `
      INSERT INTO sale_payments (sale_id, method, amount, currency, reference, meta)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const values = [
      saleId,
      p.method,
      p.amount,
      p.currency || 'LKR',
      p.reference,
      p.meta,
    ];
    return client.query(query, values);
  });
  await Promise.all(insertPromises);
}

async function listBySaleId(client, saleId) {
  const res = await client.query('SELECT * FROM sale_payments WHERE sale_id = $1', [
    saleId,
  ]);
  return res.rows;
}

module.exports = { insertMany, listBySaleId };
