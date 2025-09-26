const db = require("../../../../config/dbConfig");
const updateStock = require("../../helpers/updateStock.helper");


const addItemToSale = async (req, res) => {
  const pool = db.getPool();
  const client = await pool.connect();

  try {
    const sale_public_id = req.body.sale_public_id || req.body.sale_id;
    const { item_id } = req.body;
    const quantity = +req.body.quantity;

    if (!sale_public_id || !item_id || !Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: "sale_public_id (or sale_id), item_id, and positive quantity are required",
      });
    }

    await client.query("BEGIN");

    // lock sale row
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
      return res.status(400).json({ success: false, error: "Sale is not in processing status" });
    }

    // get inventory price + stock
    const invRes = await client.query(
      `SELECT sale_price, stock FROM inventory_items WHERE id = $1 FOR UPDATE`,
      [item_id]
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
    if (quantity > stock) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: "Insufficient stock", available: stock });
    }

    // insert or update sale_items
    const existing = await client.query(
      `SELECT id, quantity FROM sale_items WHERE sale_public_id = $1 AND item_id = $2 FOR UPDATE`,
      [sale_public_id, item_id]
    );

    if (existing.rowCount === 0) {
      const total_price = +(quantity * unit_price).toFixed(2);
      await client.query(
        `INSERT INTO sale_items (sale_public_id, item_id, quantity, unit_price, total_price)
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

    // update stock
    const { success } = await updateStock(client, item_id, -quantity);
    if (!success) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: "Insufficient stock" });
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
      [sale_public_id]
    );

    await client.query("COMMIT");

    // fetch updated sale + items
    const saleRes = await client.query(`SELECT * FROM sales WHERE public_id = $1`, [sale_public_id]);
    const itemsRes = await client.query(`SELECT * FROM sale_items WHERE sale_public_id = $1`, [sale_public_id]);

    return res.status(200).json({
      success: true,
      message: "Item added to sale successfully",
      sale: {
        ...saleRes.rows[0],
        items: itemsRes.rows,
      },
    });
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("Error adding item to sale:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  } finally {
    client.release();
  }
};

module.exports = { addItemToSale };
