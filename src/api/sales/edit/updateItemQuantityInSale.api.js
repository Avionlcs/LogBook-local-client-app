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
      return res.status(400).json({
        success: false,
        error: "saleid, itemid, and positive amount are required",
      });
    }
    if (incordec !== "inc" && incordec !== "dec") {
      return res.status(400).json({
        success: false,
        error: "incordec must be 'inc' or 'dec'",
      });
    }

    await client.query("BEGIN");

    // 1) Lock sale row
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
      return res.status(400).json({
        success: false,
        error: "Cannot update items unless sale status is 'processing'",
      });
    }

    // 2) Lock inventory row; get price + stock
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

    // 3) Lock sale_items row if exists
    const existing = await client.query(
      `SELECT id, quantity
         FROM sale_items
        WHERE sale_public_id = $1 AND item_id = $2
        FOR UPDATE`,
      [saleid, itemid]
    );

    let updatedItem = null;
    let applied = 0;
    let capped = false;

    if (incordec === "inc") {
      // INC logic
      if (existing.rowCount === 0) {
        // New line
        if (mode === "strict" && deltaReq > stock) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: "Insufficient stock",
            available: stock
          });
        }
        const incQty = mode === "cap" ? Math.min(deltaReq, stock) : deltaReq;
        if (incQty <= 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: "No stock available to add",
            available: stock
          });
        }
        capped = (mode === "cap" && incQty < deltaReq);
        const total_price = +(incQty * unit_price).toFixed(2);

        const insertRes = await client.query(
          `INSERT INTO sale_items (sale_public_id, item_id, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [saleid, itemid, incQty, unit_price, total_price]
        );
        updatedItem = insertRes.rows[0];
        applied = incQty;

        // Move stock by -applied
        const { success } = await updateStock(client, itemid, -applied);
        if (!success) {
          await client.query("ROLLBACK");
          return res.status(400).json({ success: false, error: "Insufficient stock" });
        }

        // Refresh remaining stock
        const stockRes = await client.query(`SELECT stock FROM inventory_items WHERE id = $1`, [itemid]);
        stock = +stockRes.rows[0].stock;

      } else {
        // Update existing line
        const currentQty = +existing.rows[0].quantity;

        if (mode === "strict" && deltaReq > stock) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: "Insufficient stock",
            available: stock
          });
        }
        const incQty = mode === "cap" ? Math.min(deltaReq, stock) : deltaReq;
        if (incQty <= 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: "No stock available to add",
            available: stock
          });
        }
        capped = (mode === "cap" && incQty < deltaReq);

        const newQty = currentQty + incQty;
        const newTotal = +(newQty * unit_price).toFixed(2);

        const updateRes = await client.query(
          `UPDATE sale_items
              SET quantity = $1, unit_price = $2, total_price = $3
            WHERE id = $4
            RETURNING *`,
          [newQty, unit_price, newTotal, existing.rows[0].id]
        );
        updatedItem = updateRes.rows[0];
        applied = incQty;

        const { success } = await updateStock(client, itemid, -applied);
        if (!success) {
          await client.query("ROLLBACK");
          return res.status(400).json({ success: false, error: "Insufficient stock" });
        }

        const stockRes = await client.query(`SELECT stock FROM inventory_items WHERE id = $1`, [itemid]);
        stock = +stockRes.rows[0].stock;
      }
    } else {
      // DEC logic
      if (existing.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: "Item not in sale to decrement"
        });
      }

      const currentQty = +existing.rows[0].quantity;

      if (forceRemove) {
        // Remove entire line regardless of request amount
        applied = Math.min(currentQty, deltaReq); // what we actually remove (for stock add-back)
        await client.query(`DELETE FROM sale_items WHERE id = $1`, [existing.rows[0].id]);
        updatedItem = null;

        const { success } = await updateStock(client, itemid, +applied); // add back stock
        if (!success) {
          await client.query("ROLLBACK");
          return res.status(400).json({ success: false, error: "Stock update failed" });
        }

        const stockRes = await client.query(`SELECT stock FROM inventory_items WHERE id = $1`, [itemid]);
        stock = +stockRes.rows[0].stock;

      } else {
        // Strict decrement: cannot go below zero
        if (deltaReq > currentQty) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            success: false,
            error: "Quantity cannot go below zero",
            currentQty
          });
        }

        const newQty = currentQty - deltaReq;
        applied = deltaReq;

        if (newQty === 0) {
          await client.query(`DELETE FROM sale_items WHERE id = $1`, [existing.rows[0].id]);
          updatedItem = null;
        } else {
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

        const { success } = await updateStock(client, itemid, +applied); // add back stock
        if (!success) {
          await client.query("ROLLBACK");
          return res.status(400).json({ success: false, error: "Stock update failed" });
        }

        const stockRes = await client.query(`SELECT stock FROM inventory_items WHERE id = $1`, [itemid]);
        stock = +stockRes.rows[0].stock;
      }
    }

    await client.query("COMMIT");
    return res.status(200).json({
      success: true,
      message: "Sale item updated successfully",
      item: updatedItem,             // null if removed
      applied,                       // how many units actually applied (inc/dec)
      remaining_stock: stock,        // stock after mutation
      ...(capped ? { capped: true } : {})
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
