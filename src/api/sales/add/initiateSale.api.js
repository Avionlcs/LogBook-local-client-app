const db = require("../../../config/dbConfig");
const updateStock = require("../helpers/updateStock.helper");

const initiateSale = async (req, res) => {
  const pool = db.getPool();
  const client = await pool.connect();

  try {
    const seller_user_id = req.user?.id;
    if (!seller_user_id) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }

    const { item } = req.body; // optional initial item

    await client.query("BEGIN");

    // create sale
    const saleResult = await client.query(
      `INSERT INTO sales (seller_user_id, status, total_amount, total_offer_discount, total_paid_amount)
       VALUES ($1, 'processing', 0, 0, 0)
       RETURNING public_id`,
      [seller_user_id]
    );

    const sale_public_id = saleResult.rows[0].public_id;

    if (item) {
      const { item_id, quantity } = item;
      const qty = +quantity;

      if (!item_id || !Number.isFinite(qty) || qty <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: "item_id and positive quantity are required",
        });
      }

      // get inventory price
      const invRes = await client.query(
        `SELECT sale_price, stock FROM inventory_items WHERE id = $1 FOR UPDATE`,
        [item_id]
      );
      if (invRes.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ success: false, error: "Item not found in inventory" });
      }

      const unit_price = +invRes.rows[0].sale_price;
      const stock = +invRes.rows[0].stock;

      if (!Number.isFinite(unit_price) || unit_price <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, error: "Invalid sale price for item" });
      }
      if (qty > stock) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, error: "Insufficient stock", available: stock });
      }

      const total_price = +(qty * unit_price).toFixed(2);

      await client.query(
        `INSERT INTO sale_items (sale_public_id, item_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale_public_id, item_id, qty, unit_price, total_price]
      );

      // decrement stock
      const { success } = await updateStock(client, item_id, -qty);
      if (!success) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, error: "Insufficient stock for initial item" });
      }

      // update totals
      await client.query(
        `UPDATE sales
           SET total_amount = (
                 SELECT COALESCE(SUM(total_price), 0)
                   FROM sale_items
                  WHERE sale_public_id = $1
             ),
             updated_at = NOW()
         WHERE public_id = $1`,
        [sale_public_id]
      );
    }

    await client.query("COMMIT");

    // fetch updated sale + items
    const saleRes = await client.query(`SELECT * FROM sales WHERE public_id = $1`, [sale_public_id]);
    const itemsRes = await client.query(`SELECT * FROM sale_items WHERE sale_public_id = $1`, [sale_public_id]);

    return res.status(201).json({
      success: true,
      message: "Sale initiated successfully",
      sale: {
        ...saleRes.rows[0],
        items: itemsRes.rows,
      },
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("Error initiating sale:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  } finally {
    client.release();
  }
};

module.exports = { initiateSale };
