
// Items by sale
module.exports = (c, id) => 
  c.query("SELECT * FROM sale_items WHERE sale_public_id=$1 ORDER BY id", [id])
    .then(r => r.rows);
