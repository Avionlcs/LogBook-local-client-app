const db = require("../../../config/dbConfig");
const updateStock = require("../helpers/updateStock.helper");


const removeItemFromSale = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const sale_id = parseInt(req.query.sale_id, 10);
        const item_id = req.query.item_id;
        const quantityToRemove = req.query.quantity ? parseInt(req.query.quantity, 10) : null;

        if (!sale_id || !item_id) {
            return res.status(400).json({ success: false, error: "sale_id and item_id required" });
        }

        if (quantityToRemove !== null && quantityToRemove <= 0) {
            return res.status(400).json({ success: false, error: "quantity must be positive if provided" });
        }

        await client.query("BEGIN");

        // Lock the sale row to avoid race conditions
        const saleCheck = await client.query(
            "SELECT status FROM sales WHERE id = $1 FOR UPDATE",
            [sale_id]
        );

        if (saleCheck.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, error: "Sale not found" });
        }

        if (saleCheck.rows[0].status !== "processing") {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, error: "Can only remove items when sale status is 'processing'" });
        }

        // Get existing sale item
        const saleItemRes = await client.query(
            "SELECT id, quantity, unit_price FROM sale_items WHERE sale_id = $1 AND item_id = $2",
            [sale_id, item_id]
        );

        if (saleItemRes.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, error: "Item not found in sale" });
        }

        const saleItem = saleItemRes.rows[0];
        const currentQty = saleItem.quantity;

        let qtyToRestore;
        if (quantityToRemove === null || quantityToRemove >= currentQty) {
            // Remove entire item
            qtyToRestore = currentQty;
            await client.query("DELETE FROM sale_items WHERE id = $1", [saleItem.id]);
        } else {
            // Reduce quantity by quantityToRemove
            qtyToRestore = quantityToRemove;
            const newQty = currentQty - quantityToRemove;
            const newTotalPrice = +(newQty * saleItem.unit_price).toFixed(2);

            await client.query(
                `UPDATE sale_items SET quantity = $1, total_price = $2 WHERE id = $3`,
                [newQty, newTotalPrice, saleItem.id]
            );
        }

        // Restore stock by qtyToRestore (positive number)
        const { success } = await updateStock(client, item_id, qtyToRestore);
        if (!success) {
            await client.query("ROLLBACK");
            return res.status(500).json({ success: false, error: "Failed to restore stock" });
        }

        await client.query("COMMIT");

        res.status(200).json({
            success: true,
            message: quantityToRemove
                ? `Removed ${qtyToRestore} items from sale`
                : `Removed item from sale entirely`,
        });
    } catch (error) {
        try { await client.query("ROLLBACK"); } catch (_) { }
        console.error("Error removing item from sale:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    } finally {
        client.release();
    }
};

module.exports = { removeItemFromSale };
