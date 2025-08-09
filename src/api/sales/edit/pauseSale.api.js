const db = require("../../../config/dbConfig");

const pauseSale = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const { sale_id } = req.body;
        if (!sale_id) {
            return res.status(400).json({ success: false, error: "sale_id is required" });
        }

        await client.query("BEGIN");

        // Check sale exists and is currently processing
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
            return res.status(400).json({
                success: false,
                error: "Only sales with status 'processing' can be paused"
            });
        }

        // Update status to paused
        await client.query(
            "UPDATE sales SET status = 'paused', updated_at = NOW() WHERE id = $1",
            [sale_id]
        );

        await client.query("COMMIT");

        res.status(200).json({ success: true, message: "Sale paused successfully" });
    } catch (error) {
        try { await client.query("ROLLBACK"); } catch (_) { }
        console.error("Error pausing sale:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    } finally {
        client.release();
    }
};

module.exports = { pauseSale };
