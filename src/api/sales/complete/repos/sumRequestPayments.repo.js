// Sum payments via parameterized VALUES
module.exports=(c,p)=>{
  if(!p.length)return 0;
  const params=[], tuples=[];
  p.forEach((x,i)=>{params.push(x.amount);tuples.push(`($${i+1}::NUMERIC(12,2))`);});
  const sql=`SELECT COALESCE(SUM(v),0)::NUMERIC(12,2) s FROM (VALUES \${tuples.join(",")}) t(v)`;
  return c.query(sql,params).then(r=>r.rows[0].s);
};
