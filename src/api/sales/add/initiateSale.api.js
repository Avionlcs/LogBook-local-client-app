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

    const { item } = req.body; // Optional initial item

    await client.query("BEGIN");

    // Create sale; status = processing; RETURN the short BASE-36 public_id
    const saleResult = await client.query(
      `
      INSERT INTO sales (seller_user_id, status)
      VALUES ($1, 'processing')
      RETURNING public_id
    `,
      [seller_user_id]
    );

    const sale_public_id = saleResult.rows[0].public_id; // short, uppercase base-36

    if (item) {
      const { item_id, quantity, unit_price } = item;

      if (!item_id || !Number.isFinite(+quantity) || !Number.isFinite(+unit_price)) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: "item_id, quantity, unit_price are required and must be valid numbers",
        });
      }

      const qty =+ quantity;
      const price =+ unit_price;
      const total_price = +(qty * price).toFixed(2);

      // Insert into sale_items using sale_public_id (FK to sales.public_id)
      await client.query(
        `
        INSERT INTO sale_items (sale_public_id, item_id, quantity, unit_price, total_price)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [sale_public_id, item_id, qty, price, total_price]
      );

      // Decrease stock / increase sold via helper (transaction-safe)
      const { success } = await updateStock(client, item_id, -qty);
      if (!success) {
        await client.query("ROLLBACK");
        return res
          .status(400)
          .json({ success: false, error: "Insufficient stock for initial item" });
      }
    }

    await client.query("COMMIT");

    // Return short public id (external-friendly)
    return res.status(201).json({ success: true, sale_public_id });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (_) {}
    console.error("Error initiating sale:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  } finally {
    client.release();
  }
};

module.exports = { initiateSale };
