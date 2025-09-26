const db = require("../../../../config/dbConfig");

const resumeSale = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const { sale_id } = req.body;
        if (!sale_id) {
            return res.status(400).json({ success: false, error: "sale_id is required" });
        }

        await client.query("BEGIN");

        // Check if sale exists and is currently paused
        const saleCheck = await client.query(
            "SELECT status FROM sales WHERE id = $1 FOR UPDATE",
            [sale_id]
        );

        if (saleCheck.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, error: "Sale not found" });
        }

        if (saleCheck.rows[0].status !== "paused") {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, error: "Sale is not paused" });
        }

        // Update sale status back to processing
        await client.query(
            `UPDATE sales SET status = 'processing', updated_at = NOW() WHERE id = $1`,
            [sale_id]
        );

        await client.query("COMMIT");

        res.json({ success: true, message: "Sale resumed and set to processing" });
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (_) { }
        console.error("Error resuming sale:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    } finally {
        client.release();
    }
};

module.exports = { resumeSale };
