// src/api/sales/verifySale.api.js
const db = require("../../../config/dbConfig");

const verifySale = async (req, res) => {
  const pool = db.getPool();
  const client = await pool.connect();

  try {
    const { saleId } = req.params;

    if (!saleId) {
      return res.status(400).json({ success: false, error: "saleId required" });
    }

    const result = await client.query(
      `SELECT public_id, status 
         FROM sales 
        WHERE public_id = $1`,
      [saleId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: "Sale not found" });
    }

    const sale = result.rows[0];
    if (sale.status !== "processing") {
      return res.status(400).json({ success: false, error: "Sale not in processing state" });
    }
    console.log(sale);
    

    return res.json({ success: true, saleId: sale.public_id });
  } catch (err) {
    console.error("Error verifying sale:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  } finally {
    client.release();
  }
};

module.exports = { verifySale };
