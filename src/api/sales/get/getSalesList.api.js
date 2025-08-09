const db = require("../../../config/dbConfig");

const getSales = async (req, res) => {
    const pool = db.getPool();

    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
        const seller_user_id = req.query.seller_user_id;
        const status = req.query.status;

        const values = [];
        let whereClauses = [];

        if (seller_user_id) {
            values.push(seller_user_id);
            whereClauses.push(`seller_user_id = $${values.length}`);
        }

        if (status) {
            values.push(status);
            whereClauses.push(`status = $${values.length}`);
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

        const query = `
      SELECT * FROM sales
      ${whereClause}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT $${values.length + 1}
    `;

        values.push(limit);

        const { rows: sales } = await pool.query(query, values);

        res.json({ success: true, sales });
    } catch (error) {
        console.error("Error fetching sales:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
};

module.exports = { getSales };
