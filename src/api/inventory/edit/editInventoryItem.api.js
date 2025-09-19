const db = require("../../../config/dbConfig");
const { makeHash } = require("../../../config/tables/hash/helpers/makeHashes.helper");

module.exports = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const item = req.body;
        if (!item || typeof item !== "object" || !item.id) {
            return res.status(400).json({ success: false, error: "Invalid or missing item ID" });
        }

        const {
            id,
            name,
            stock,
            min_stock,
            buy_price,
            sale_price,
            barcode,
            sold,
            ...dynamicFields
        } = item;

        await client.query("BEGIN");

        // --- Update core fields ---
        const coreUpdateFields = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) { coreUpdateFields.push(`name = $${idx++}`); values.push(name); }
        if (stock !== undefined) { coreUpdateFields.push(`stock = $${idx++}`); values.push(parseInt(stock)); }
        if (min_stock !== undefined) { coreUpdateFields.push(`min_stock = $${idx++}`); values.push(parseInt(min_stock)); }
        if (buy_price !== undefined) { coreUpdateFields.push(`buy_price = $${idx++}`); values.push(parseFloat(buy_price)); }
        if (sale_price !== undefined) { coreUpdateFields.push(`sale_price = $${idx++}`); values.push(parseFloat(sale_price)); }
        if (barcode !== undefined) { coreUpdateFields.push(`barcode = $${idx++}`); values.push(barcode); }
        if (sold !== undefined) { coreUpdateFields.push(`sold = $${idx++}`); values.push(parseInt(sold)); }

        // Always update timestamp
        coreUpdateFields.push(`updated_at = NOW()`);

        if (coreUpdateFields?.length > 0) {
            values.push(id);
            await client.query(
                `UPDATE inventory_items
                 SET ${coreUpdateFields.join(", ")}
                 WHERE id = $${idx}
                `,
                values
            );
        }

        // --- Update metadata ---
        if (Object.keys(dynamicFields)?.length > 0) {
            // Remove old metadata for these keys
            await client.query(
                `DELETE FROM inventory_item_metadata
                 WHERE item_id = $1
                 AND field_name = ANY($2::text[])`,
                [id, Object.keys(dynamicFields)]
            );

            // Insert updated metadata
            for (const [field, value] of Object.entries(dynamicFields)) {
                await client.query(
                    `INSERT INTO inventory_item_metadata (item_id, field_name, field_value)
                     VALUES ($1, $2, $3)`,
                    [id, field, value?.toString() ?? null]
                );
            }
        }

        // --- Refresh hash indexes ---
        // Delete old hashes for this item
        await client.query(
            `DELETE FROM hash_reference_ids WHERE reference_id = $1`,
            [id]
        );

        // Also clean up orphaned entries in hash_table
        await client.query(`
            DELETE FROM hash_table
            WHERE hash NOT IN (SELECT hash FROM hash_reference_ids)
        `);

        // Build full item data for hashing
        const { rows: coreDataRows } = await client.query(
            `SELECT * FROM inventory_items WHERE id = $1`,
            [id]
        );
        const coreData = coreDataRows[0] || {};

        const { rows: metadataRows } = await client.query(
            `SELECT field_name, field_value FROM inventory_item_metadata WHERE item_id = $1`,
            [id]
        );

        for (const { field_name, field_value } of metadataRows) {
            coreData[field_name] = field_value;
        }

        const hashElements = [
            "name", "stock", "min_stock", "buy_price",
            "sale_price", "barcode", "sold",
            ...metadataRows.map(m => m.field_name)
        ];

        await makeHash(coreData, "inventory_items", hashElements, client);

        await client.query("COMMIT");

        return res.json({ success: true, id, updated: true });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error updating inventory item:", error);
        return res.status(500).json({ success: false, error: error.message || "Internal server error" });
    } finally {
        client.release();
    }
};
