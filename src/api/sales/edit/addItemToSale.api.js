// src/api/sales/edit/addItemToSale.api.js
const db = require("../../../config/dbConfig");
const updateStock = require("../../inventory/helpers/updateStock.helper");

const addItemToSale = async (req, res) => {
  const pool = db.getPool();
  const client = await pool.connect();
console.log(req.body);

  try {
    // accept either sale_public_id or legacy sale_id (but we treat it as public_id)
    const sale_public_id = req.body.sale_public_id || req.body.sale_id;
    const { item_id } = req.body;
    const quantity = +req.body.quantity;
    const unit_price = +req.body.unit_price;

    if (!sale_public_id || !item_id || !Number.isFinite(quantity) || !Number.isFinite(unit_price)) {
      return res.status(400).json({
        success: false,
        error: "sale_public_id (or sale_id), item_id, quantity, unit_price required",
      });
    }
    if (quantity <= 0 || unit_price <= 0) {
      return res.status(400).json({
        success: false,
        error: "quantity and unit_price must be positive numbers",
      });
    }

    await client.query("BEGIN");

    // lock sale row by public_id
    const saleCheck = await client.query(
      "SELECT status FROM sales WHERE public_id = $1 FOR UPDATE",
      [sale_public_id]
    );
    if (saleCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Sale not found" });
    }
    if (saleCheck.rows[0].status !== "processing") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "Cannot add items unless sale status is 'processing'",
      });
    }

    // upsert-like behavior on sale_items keyed by (sale_public_id, item_id)
    const existing = await client.query(
      `SELECT id, quantity, unit_price
         FROM sale_items
        WHERE sale_public_id = $1 AND item_id = $2
        FOR UPDATE`,
      [sale_public_id, item_id]
    );

    if (existing.rowCount === 0) {
      const total_price = +(quantity * unit_price).toFixed(2);
      await client.query(
        `INSERT INTO sale_items
           (sale_public_id, item_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale_public_id, item_id, quantity, unit_price, total_price]
      );
    } else {
      const newQty = existing.rows[0].quantity + quantity;
      const newTotal = +(newQty * unit_price).toFixed(2);
      await client.query(
        `UPDATE sale_items
            SET quantity = $1, unit_price = $2, total_price = $3
          WHERE id = $4`,
        [newQty, unit_price, newTotal, existing.rows[0].id]
      );
    }

    // stock mutation (decrement)
    const { success } = await updateStock(client, item_id, -quantity);
    if (!success) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: "Insufficient stock" });
    }

    await client.query("COMMIT");
    
    return res.status(200).json({ success: true, message: "Item added to sale successfully" });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("Error adding item to sale:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  } finally {
    client.release();
  }
};

module.exports = { addItemToSale };
