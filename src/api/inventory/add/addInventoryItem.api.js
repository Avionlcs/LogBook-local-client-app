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

        let itemId;
        let modifiedBarcode = barcode;
        let attempt = 0;
        const MAX_ATTEMPTS = 5;

        while (attempt < MAX_ATTEMPTS) {
            try {
                await client.query('BEGIN');

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
                    modifiedBarcode,
                    parseInt(sold),
                ]);

                itemId = result.rows[0].id;
                break;

            } catch (insertErr) {
                const isDuplicateBarcode =
                    insertErr.code === '23505' &&
                    insertErr.message.includes('inventory_items_barcode_key');

                await client.query('ROLLBACK');

                if (!isDuplicateBarcode) throw insertErr;

                attempt++;
                modifiedBarcode = `${barcode}-${Math.random().toString(36).substring(2, 6)}`;
            }
        }

        if (!itemId) {
            throw new Error('Failed to insert unique barcode after multiple attempts');
        }

        await client.query('BEGIN');

        for (const [field, value] of Object.entries(dynamicFields)) {
            await client.query(
                `INSERT INTO inventory_item_metadata (item_id, field_name, field_value) VALUES ($1, $2, $3);`,
                [itemId, field, value?.toString() ?? null]
            );
        }

        const fullItem = {
            id: itemId,
            name,
            stock: parseInt(stock),
            min_stock: parseInt(min_stock),
            buy_price: parseFloat(buy_price),
            sale_price: parseFloat(sale_price),
            barcode: modifiedBarcode,
            sold: parseInt(sold),
        };

        const metadataResult = await client.query(
            `SELECT field_name, field_value FROM inventory_item_metadata WHERE item_id = $1;`,
            [itemId]
        );

        metadataResult.rows.forEach(({ field_name, field_value }) => {
            fullItem[field_name] = field_value;
        });

        const coreKeys = ['name', 'stock', 'min_stock', 'buy_price', 'sale_price', 'barcode', 'sold'];
        const dynamicKeys = Object.keys(dynamicFields);
        const hashElements = coreKeys.concat(dynamicKeys);

        await makeHash(fullItem, 'inventory_items', hashElements, client);

        await client.query('COMMIT');

        res.status(201).json({ success: true, item: fullItem });

    } catch (error) {
        try {
            await client.query('ROLLBACK');
        } catch (_) { }
        console.error('Error adding inventory item:', error);
        res.status(500).json({ success: false, error: error.message || 'Internal server error' });
    } finally {
        client.release();
    }
};
