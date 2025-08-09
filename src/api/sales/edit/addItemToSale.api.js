const db = require("../../../config/dbConfig");
const updateStock = require("../../inventory/helpers/updateStock.helper");

const addItemToSale = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const { sale_id, item_id, quantity, unit_price } = req.body;
        if (!sale_id || !item_id || !quantity || !unit_price) {
            return res
                .status(400)
                .json({ success: false, error: "sale_id, item_id, quantity, unit_price required" });
        }

        if (quantity <= 0 || unit_price <= 0) {
            return res
                .status(400)
                .json({ success: false, error: "quantity and unit_price must be positive numbers" });
        }

        await client.query("BEGIN");

        // Check sale exists and status = processing
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
            return res
                .status(400)
                .json({ success: false, error: "Cannot add items unless sale status is 'processing'" });
        }

        // Check if item already in sale_items for this sale
        const existingItem = await client.query(
            "SELECT id, quantity, total_price FROM sale_items WHERE sale_id = $1 AND item_id = $2",
            [sale_id, item_id]
        );

        const total_price = +(quantity * unit_price).toFixed(2);

        if (existingItem.rowCount === 0) {
            // Insert new sale item
            await client.query(
                `INSERT INTO sale_items (sale_id, item_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
                [sale_id, item_id, quantity, unit_price, total_price]
            );
        } else {
            // Update existing sale item quantity and total_price
            const newQuantity = existingItem.rows[0].quantity + quantity;
            const newTotalPrice = +(newQuantity * unit_price).toFixed(2);

            await client.query(
                `UPDATE sale_items SET quantity = $1, total_price = $2 WHERE id = $3`,
                [newQuantity, newTotalPrice, existingItem.rows[0].id]
            );
        }

        // Update stock (decrease stock by quantity)
        const { success } = await updateStock
            (client, item_id, -quantity);
        if (!success) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, error: "Insufficient stock" });
        }

        await client.query("COMMIT");

        res.status(200).json({ success: true, message: "Item added to sale successfully" });
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (_) { }
        console.error("Error adding item to sale:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    } finally {
        client.release();
    }
};

module.exports = { addItemToSale };
