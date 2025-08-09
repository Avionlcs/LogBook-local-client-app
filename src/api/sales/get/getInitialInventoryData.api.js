const db = require("../../../config/dbConfig");

module.exports = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        let limit = parseInt(req.query.limit, 10);
        if (isNaN(limit) || limit <= 0) {
            limit = 100;
        } else if (limit > 1000) {
            limit = 1000;
        }

        const query = `
      SELECT * FROM inventory_items
      ORDER BY updated_at DESC
      LIMIT $1
    `;

        const result = await client.query(query, [limit]);
        const items = result.rows;

        return res.json(items);
    } catch (error) {
        console.error("DB Query Error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    } finally {
        client.release();
    }
};
