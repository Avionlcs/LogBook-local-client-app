const db = require("../../../config/dbConfig");
const { makeHash } = require("../../../config/tables/hash/helpers/makeHashes.helper");

module.exports = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const item = req.body;

        if (!item || typeof item !== 'object') {
            client.release();
            return res.status(400).json({ success: false, error: 'Invalid item data' });
        }

        await client.query('BEGIN');

        const {
            name = 'N/A',
            stock = 0,
            min_stock = 0,
            buy_price = 0,
            sale_price = 0,
            barcode = null,
            sold = 0,
            ...dynamicFields
        } = item;

        const insertItemQuery = `
      INSERT INTO inventory_items 
        (name, stock, min_stock, buy_price, sale_price, barcode, sold)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;

        const result = await client.query(insertItemQuery, [
            name,
            parseInt(stock),
            parseInt(min_stock),
            parseFloat(buy_price),
            parseFloat(sale_price),
            barcode,
            parseInt(sold),
        ]);

        const itemId = result.rows[0].id;

        for (const [field, value] of Object.entries(dynamicFields)) {
            await client.query(
                `INSERT INTO inventory_item_metadata (item_id, field_name, field_value) VALUES ($1, $2, $3);`,
                [itemId, field, value?.toString() ?? null]
            );
        }

        item.id = itemId;

        const coreKeys = ['name', 'stock', 'min_stock', 'buy_price', 'sale_price', 'barcode', 'sold'];
        const dynamicKeys = Object.keys(dynamicFields);
        const hashElements = coreKeys.concat(dynamicKeys);

        await makeHash(item, 'inventory_items', hashElements, client);

        await client.query('COMMIT');

        res.status(201).json({ success: true, itemId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding inventory item:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    } finally {
        client.release();
    }
};
