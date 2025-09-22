// src/api/sales/edit/updateItemQuantityInSale.api.js
const db = require("../../../config/dbConfig");
const updateStock = require("../helpers/updateStock.helper");

const updateItemQuantityInSale = async (req, res) => {
  const pool = db.getPool();
  const client = await pool.connect();

  try {
    const { saleid, itemid, amount, incordec } = req.body;
    console.log(req.body);
    
    const deltaReq = Number(amount);
    const mode = (req.body.mode === "cap" ? "cap" : "strict");
    const forceRemove = Boolean(req.body.forceRemove);

    if (!saleid || !itemid || !Number.isFinite(deltaReq) || deltaReq <= 0) {
      return res.status(400).json({ success: false, error: "saleid, itemid, and positive amount are required" });
    }
    if (incordec !== "inc" && incordec !== "dec") {
      return res.status(400).json({ success: false, error: "incordec must be 'inc' or 'dec'" });
    }

    await client.query("BEGIN");

    // lock sale
    const saleCheck = await client.query(
      `SELECT status FROM sales WHERE public_id = $1 FOR UPDATE`,
      [saleid]
    );
    if (saleCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Sale not found" });
    }
    if (saleCheck.rows[0].status !== "processing") {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: "Sale not in processing status" });
    }

    // lock inventory
    const invRes = await client.query(
      `SELECT sale_price, stock FROM inventory_items WHERE id = $1 FOR UPDATE`,
      [itemid]
    );
    if (invRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Item not found in inventory" });
    }
    const unit_price = +invRes.rows[0].sale_price;
    let stock = +invRes.rows[0].stock;

    if (!Number.isFinite(unit_price) || unit_price <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: "Invalid sale price for item" });
    }

    // lock sale_items
    const existing = await client.query(
      `SELECT id, quantity FROM sale_items WHERE sale_public_id = $1 AND item_id = $2 FOR UPDATE`,
      [saleid, itemid]
    );

    let updatedItem = null;

    if (incordec === "inc") {
      // increment
      const incQty = mode === "cap" ? Math.min(deltaReq, stock) : deltaReq;
      if (incQty <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, error: "Insufficient stock" });
      }

      if (existing.rowCount === 0) {
        const total_price = +(incQty * unit_price).toFixed(2);
        const insertRes = await client.query(
          `INSERT INTO sale_items (sale_public_id, item_id, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [saleid, itemid, incQty, unit_price, total_price]
        );
        updatedItem = insertRes.rows[0];
      } else {
        const newQty = existing.rows[0].quantity + incQty;
        const newTotal = +(newQty * unit_price).toFixed(2);
        const updateRes = await client.query(
          `UPDATE sale_items
              SET quantity = $1, unit_price = $2, total_price = $3
            WHERE id = $4
            RETURNING *`,
          [newQty, unit_price, newTotal, existing.rows[0].id]
        );
        updatedItem = updateRes.rows[0];
      }

      const { success } = await updateStock(client, itemid, -incQty);
      if (!success) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, error: "Insufficient stock" });
      }
    } else {
      // decrement
      if (existing.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, error: "Item not in sale" });
      }

      const currentQty = existing.rows[0].quantity;
      if (forceRemove || deltaReq >= currentQty) {
        await client.query(`DELETE FROM sale_items WHERE id = $1`, [existing.rows[0].id]);
        await updateStock(client, itemid, currentQty); // return all stock
        updatedItem = null;
      } else {
        const newQty = currentQty - deltaReq;
        const newTotal = +(newQty * unit_price).toFixed(2);
        const updateRes = await client.query(
          `UPDATE sale_items
              SET quantity = $1, unit_price = $2, total_price = $3
            WHERE id = $4
            RETURNING *`,
          [newQty, unit_price, newTotal, existing.rows[0].id]
        );
        updatedItem = updateRes.rows[0];
        await updateStock(client, itemid, deltaReq); // return stock
      }
    }

    // update parent sale totals
    await client.query(
      `UPDATE sales
         SET total_amount = (
               SELECT COALESCE(SUM(total_price), 0)
                 FROM sale_items
                WHERE sale_public_id = $1
           ),
           updated_at = NOW()
       WHERE public_id = $1`,
      [saleid]
    );

    await client.query("COMMIT");

    // fetch updated sale + items
    const saleRes = await client.query(`SELECT * FROM sales WHERE public_id = $1`, [saleid]);
    const itemsRes = await client.query(`SELECT * FROM sale_items WHERE sale_public_id = $1`, [saleid]);

    return res.status(200).json({
      success: true,
      message: "Sale item updated successfully",
      sale: {
        ...saleRes.rows[0],
        items: itemsRes.rows,
      },
      item: updatedItem,
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("Error updating sale item:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  } finally {
    client.release();
  }
};

module.exports = { updateItemQuantityInSale };
