
module.exports = (c, payments) => {
  if (!payments.length) return 0;

  const amounts = payments.map(x => Number(x.amount));
  const sql = "SELECT COALESCE(SUM(x),0)::NUMERIC(12,2) s FROM unnest($1::NUMERIC(12,2)[]) x";

  return c.query(sql, [amounts]).then(r => r.rows[0].s);
};
