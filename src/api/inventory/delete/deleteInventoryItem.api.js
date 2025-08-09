const db = require("../../../config/dbConfig");

module.exports = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ success: false, error: "Item ID is required" });
        }

        await client.query("BEGIN");

        // Remove hashes for this item
        await client.query(
            `DELETE FROM hash_reference_ids WHERE reference_id = $1`,
            [id]
        );

        // Remove orphaned hash_table entries
        await client.query(`
            DELETE FROM hash_table
            WHERE hash NOT IN (SELECT hash FROM hash_reference_ids)
        `);

        // Delete inventory item (metadata auto-deletes via ON DELETE CASCADE)
        const result = await client.query(
            `DELETE FROM inventory_items WHERE id = $1 RETURNING *`,
            [id]
        );

        await client.query("COMMIT");

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: "Item not found" });
        }

        return res.json({ success: true, deletedItem: result.rows[0] });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error deleting inventory item:", error);
        return res.status(500).json({ success: false, error: error.message || "Internal server error" });
    } finally {
        client.release();
    }
};
