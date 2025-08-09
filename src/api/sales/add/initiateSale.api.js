const db = require("../../../config/dbConfig");
const updateStock = require("../../inventory/helpers/updateStock.helper");


const initiateSale = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const seller_user_id = req.user?.id;
        if (!seller_user_id)
            return res.status(401).json({ success: false, error: "Unauthorized" });

        const { item } = req.body; // Optional item to add on initiation

        await client.query("BEGIN");

        // Create sale with seller_user_id, status processing
        const saleResult = await client.query(
            `INSERT INTO sales (seller_user_id, status, created_at, updated_at)
       VALUES ($1, 'processing', NOW(), NOW())
       RETURNING id`,
            [seller_user_id]
        );

        const sale_id = saleResult.rows[0].id;

        if (item) {
            const { item_id, quantity, unit_price } = item;

            if (!item_id || !quantity || !unit_price) {
                await client.query("ROLLBACK");
                return res
                    .status(400)
                    .json({
                        success: false,
                        error: "item_id, quantity, unit_price required for initial item",
                    });
            }

            const total_price = +(quantity * unit_price).toFixed(2);

            // Insert sale_item
            await client.query(
                `INSERT INTO sale_items (sale_id, item_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
                [sale_id, item_id, quantity, unit_price, total_price]
            );

            // Use reusable updateStock function to decrease stock and increase sold count
            const { success } = await updateStock(client, item_id, -quantity);
            if (!success) {
                await client.query("ROLLBACK");
                return res
                    .status(400)
                    .json({ success: false, error: "Insufficient stock for initial item" });
            }
        }

        await client.query("COMMIT");

        res.status(201).json({ success: true, sale_id });
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (_) { }
        console.error("Error initiating sale:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    } finally {
        client.release();
    }
};

module.exports = { initiateSale };
