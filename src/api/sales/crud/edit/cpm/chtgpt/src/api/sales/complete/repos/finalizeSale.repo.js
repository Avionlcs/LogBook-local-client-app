// Finalize sale (status + totals + method)
module.exports=(c,id,total,reqSum,p)=>{
  const m=new Set(p.map(x=>x.method));const method=m.size===1?[...m][0]:"mixed";
  const q=`UPDATE sales SET total_amount=$2::NUMERIC(12,2),total_paid_amount=total_paid_amount+$3::NUMERIC(12,2),
    status='sold',payment_method=$4,updated_at=NOW() WHERE public_id=$1 RETURNING *`;
  return c.query(q,[id,total,reqSum,method]).then(r=>r.rows[0]);
};
