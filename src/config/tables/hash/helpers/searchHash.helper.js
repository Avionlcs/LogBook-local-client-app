const db = require("../../../dbConfig");

const generateSearchHashes = (keyword, elementKey, schemaName) => {
    const base = keyword.toLowerCase().trim();
    const hashes = new Set();

    hashes.add(base);
    if (elementKey) hashes.add(`${base}+&-${elementKey}`);
    if (schemaName) hashes.add(`${base}+&+${schemaName}`);
    if (elementKey && schemaName)
        hashes.add(`${base}+&+${schemaName}-*&${base}+&-${elementKey}`);

    return Array.from(hashes);
};

const searchHash = async ({ keyword, elementKey = null, schemaName = null }) => {
    if (!keyword || typeof keyword !== "string" || keyword.length < 2) return [];

    const pool = db.getPool();
    const hashes = generateSearchHashes(keyword, elementKey, schemaName);

    const placeholders = hashes.map((_, i) => `$${i + 1}`).join(",");
    const values = [...hashes];

    // Build additional WHERE conditions if elementKey and/or schemaName provided
    const extraConditions = [];
    if (elementKey) {
        extraConditions.push(`ht.element_key = $${values.length + 1}`);
        values.push(elementKey);
    }
    if (schemaName) {
        extraConditions.push(`ht.schema_name = $${values.length + 1}`);
        values.push(schemaName);
    }

    const whereClause = `
        hri.hash IN (${placeholders})
        ${extraConditions.length > 0 ? `AND ${extraConditions.join(" AND ")}` : ""}
    `;

    const query = `
        SELECT DISTINCT hri.reference_id
        FROM hash_reference_ids hri
        JOIN hash_table ht ON hri.hash = ht.hash
        WHERE ${whereClause}
    `;

    const result = await pool.query(query, values);
    return result.rows.map(row => row.reference_id);
};

module.exports = { searchHash };
