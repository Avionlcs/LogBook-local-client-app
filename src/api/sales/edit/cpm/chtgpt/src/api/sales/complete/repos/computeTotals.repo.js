// items - offers as NUMERIC(12,2)
module.exports=(c,id)=>c.query(
  `WITH si AS (SELECT COALESCE(SUM(total_price),0)::NUMERIC(12,2) v FROM sale_items WHERE sale_public_id=$1),
        so AS (SELECT COALESCE(SUM(discount_amount),0)::NUMERIC(12,2) v FROM sale_offers WHERE sale_public_id=$1)
    SELECT (si.v-so.v)::NUMERIC(12,2) AS total_amount FROM si,so`,[id]).then(r=>r.rows[0]);
