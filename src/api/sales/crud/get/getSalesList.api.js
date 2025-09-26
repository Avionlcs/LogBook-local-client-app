const db = require("../../../../config/dbConfig");


async function getSaleIdsFromHash(client, keyword) {
    const lowerKeyword = keyword.toLowerCase();

    // Find matching hashes with substrings containing the keyword (partial match)
    const { rows } = await client.query(`
    SELECT DISTINCT reference_id FROM hash_reference_ids hri
    JOIN hash_table ht ON hri.hash = ht.hash
    WHERE ht.substring LIKE '%' || $1 || '%'
      AND ht.schema_name = 'sales'
  `, [lowerKeyword]);

    return rows.map(r => r.reference_id);
}

const getSales = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
        const seller_user_id = req.query.seller_user_id;
        const status = req.query.status;
        const keyword = req.query.keyword;

        let whereClauses = [];
        let values = [];
        let salesIdsFilter = null;

        // Start transaction for consistent reads
        await client.query("BEGIN");

        // If keyword present, get matching sales IDs from hash tables
        if (keyword && keyword.trim()?.length >= 2) {
            const matchedIds = await getSaleIdsFromHash(client, keyword.trim());

            if (matchedIds?.length === 0) {
                // No matches, return empty result early
                await client.query("COMMIT");
                client.release();
                return res.json({ success: true, sales: [] });
            }

            salesIdsFilter = matchedIds;
            values.push(salesIdsFilter);
            whereClauses.push(`id = ANY($${values?.length}::int[])`);
        }

        if (seller_user_id) {
            values.push(seller_user_id);
            whereClauses.push(`seller_user_id = $${values?.length}`);
        }

        if (status) {
            values.push(status);
            whereClauses.push(`status = $${values?.length}`);
        }

        const whereClause = whereClauses?.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

        // Query sales with filters, sorted by updated_at DESC
        const query = `
      SELECT * FROM sales
      ${whereClause}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT $${values?.length + 1}
    `;

        values.push(limit);

        const { rows: sales } = await client.query(query, values);

        await client.query("COMMIT");
        client.release();

        return res.json({ success: true, sales });
    } catch (error) {
        try { await client.query("ROLLBACK"); } catch (_) { }
        client.release();
        console.error("Error fetching sales:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    }
};

module.exports = { getSales };
