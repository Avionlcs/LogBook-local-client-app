// Lock sale row
module.exports=(c,id)=>c.query("SELECT * FROM sales WHERE public_id=$1 FOR UPDATE",[id]).then(r=>r.rows[0]||null);
