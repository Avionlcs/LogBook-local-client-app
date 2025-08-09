async function updateStock(client, itemId, quantity) {
    if (quantity === 0) return { success: true, stock: null };

    if (quantity < 0) {
        const result = await client.query(
            `UPDATE inventory_items 
       SET stock = stock + $1, sold = sold - $1, updated_at = NOW()
       WHERE id = $2 AND (stock + $1) >= min_stock
       RETURNING stock`,
            [quantity, itemId]
        );

        if (result.rowCount > 0) {
            return { success: true, stock: result.rows[0].stock };
        }
        return { success: false, stock: null };
    } else {
        const result = await client.query(
            `UPDATE inventory_items 
       SET stock = stock + $1, sold = sold - $1, updated_at = NOW()
       WHERE id = $2
       RETURNING stock`,
            [quantity, itemId]
        );
        return { success: true, stock: result.rows[0]?.stock ?? null };
    }
}

module.exports = updateStock;
