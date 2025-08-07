const db = require('../../../dbConfig');
const { makeHash } = require('../../hash/helpers/makeHashes.helper');

const addInventoryItem = async (item) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Separate known core fields
        var {
            name = 'N/A',
            stock = 0,
            min_stock = 0,
            buy_price = 0,
            sale_price = 0,
            barcode = null,
            sold = 0,
            ...dynamicFields
        } = item;

        // Insert into inventory_items table
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
            parseInt(sold)
        ]);

        const itemId = result.rows[0].id;

        // Insert dynamic fields into inventory_item_metadata
        for (const [field, value] of Object.entries(dynamicFields)) {
            await client.query(
                `INSERT INTO inventory_item_metadata (item_id, field_name, field_value) VALUES ($1, $2, $3);`,
                [itemId, field, value?.toString() ?? null]
            );
        }

        await client.query('COMMIT');
        item.id = itemId;
        await makeHash(item)
        return { success: true, itemId };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding inventory item:', error);
        return { success: false, error };
    } finally {
        client.release();
    }
};

module.exports = { addInventoryItem };