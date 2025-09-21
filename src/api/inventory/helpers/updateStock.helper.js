// src/api/inventory/helpers/updateStock.helper.js
const updateStock = async (client, item_id, delta) => {
  try {
    // Lock row for update
    const item = await client.query(
      `SELECT stock, sold FROM inventory_items WHERE id = $1 FOR UPDATE`,
      [item_id]
    );

    if (item.rowCount === 0) {
      return { success: false, error: "Item not found" };
    }

    const { stock, sold } = item.rows[0];
    const newStock = stock + delta;
    const newSold = sold - delta; // if delta is negative (sale), sold increases

    if (newStock < 0) {
      return { success: false, error: "Insufficient stock" };
    }

    await client.query(
      `UPDATE inventory_items
         SET stock = $1,
             sold = $2,
             updated_at = NOW()
       WHERE id = $3`,
      [newStock, newSold, item_id]
    );

    return { success: true };
  } catch (err) {
    console.error("Error updating stock:", err);
    return { success: false, error: "Stock update failed" };
  }
};

module.exports = updateStock;
