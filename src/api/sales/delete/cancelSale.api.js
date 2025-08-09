const db = require("../../../config/dbConfig");
const updateStock = require("../../inventory/helpers/updateStock.helper");

const cancelSale = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const { sale_id } = req.body;
        if (!sale_id) {
            return res.status(400).json({ success: false, error: "sale_id is required" });
        }

        await client.query("BEGIN");

        // Lock sale row
        const saleCheck = await client.query(
            "SELECT status FROM sales WHERE id = $1 FOR UPDATE",
            [sale_id]
        );

        if (saleCheck.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, error: "Sale not found" });
        }

        const status = saleCheck.rows[0].status;
        if (!["processing", "paused"].includes(status)) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                success: false,
                error: "Only sales with status 'processing' or 'paused' can be cancelled"
            });
        }

        // Get all sale items for this sale
        const saleItems = await client.query(
            "SELECT item_id, quantity FROM sale_items WHERE sale_id = $1",
            [sale_id]
        );

        // Roll back stock for each sale item
        for (const { item_id, quantity } of saleItems.rows) {
            const success = await updateStock(client, item_id, quantity);
            if (!success) {
                await client.query("ROLLBACK");
                return res.status(500).json({ success: false, error: `Failed to rollback stock for item ${item_id}` });
            }
        }

        // Update sale status to cancelled
        await client.query(
            "UPDATE sales SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
            [sale_id]
        );

        await client.query("COMMIT");

        res.status(200).json({ success: true, message: "Sale cancelled successfully" });
    } catch (error) {
        try { await client.query("ROLLBACK"); } catch (_) { }
        console.error("Error cancelling sale:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    } finally {
        client.release();
    }
};

module.exports = { cancelSale };
