const { randomUUID } = require("crypto");
const db = require("../../../../config/dbConfig");
const { parseExcelFile } = require("../../../../utils/dbUtils");
const { saveBulkStatus } = require("../../../../utils/bulkProcessStatus");
const { makeHash } = require("../../../../config/tables/hash/helpers/makeHashes.helper");
const getItemFingerprintHelper = require("../../helpers/getItemFingerprint.helper");

module.exports = async (req, res) => {
    const pool = db.getPool();

    if (!req.files || req.files?.length === 0) {
        return res.status(400).json({ success: false, error: "No files uploaded" });
    }

    const processId = randomUUID();
    res.json({ processId });

    (async () => {
        const client = await pool.connect();
        let insertedIds = [];

        try {
            let totalRows = 0;
            let processedRows = 0;

            for (const file of req.files) {
                const dataArray = parseExcelFile(file.path);
                totalRows += dataArray?.length;
            }

            await saveBulkStatus(processId, {
                status: "processing",
                percentage: 0,
                totalRows,
                processedRows: 0,
            });

            for (const file of req.files) {
                const dataArray = parseExcelFile(file.path);

                for (let rowIndex = 0; rowIndex < dataArray?.length; rowIndex++) {
                    const item = dataArray[rowIndex];
                    if (!item || Object.keys(item)?.length === 0) continue;

                    const {
                        id = null,
                        name = 'N/A',
                        stock = 0,
                        min_stock = 0,
                        buy_price = 0,
                        sale_price = 0,
                        barcode = null,
                        sold = 0,
                        ...dynamicFields
                    } = item;

                    let itemId = id?.toString().trim() || randomUUID();
                    let modifiedBarcode = barcode;
                    let attempt = 0;
                    const MAX_ATTEMPTS = 5;

                    const coreItemData = {
                        name,
                        stock: parseInt(stock),
                        min_stock: parseInt(min_stock),
                        buy_price: parseFloat(buy_price),
                        sale_price: parseFloat(sale_price),
                        barcode: modifiedBarcode,
                        sold: parseInt(sold),
                        ...dynamicFields
                    };

                    const itemHash = getItemFingerprintHelper(coreItemData);

                    try {
                        while (attempt < MAX_ATTEMPTS) {
                            try {
                                await client.query('BEGIN');

                                // Attempt insert
                                const insertQuery = `
                                    INSERT INTO inventory_items 
                                        (id, name, stock, min_stock, buy_price, sale_price, barcode, sold, hash)
                                    VALUES 
                                        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                                    RETURNING id;
                                `;

                                const result = await client.query(insertQuery, [
                                    itemId,
                                    name,
                                    parseInt(stock),
                                    parseInt(min_stock),
                                    parseFloat(buy_price),
                                    parseFloat(sale_price),
                                    modifiedBarcode,
                                    parseInt(sold),
                                    itemHash
                                ]);

                                itemId = result.rows[0].id;
                                await client.query('COMMIT');
                                break;

                            } catch (err) {
                                await client.query('ROLLBACK');

                                const isDuplicateId = err.code === '23505' && err.message.includes('inventory_items_pkey');
                                const isDuplicateBarcode = err.code === '23505' && err.message.includes('inventory_items_barcode_key');
                                const isDuplicateHash = err.code === '23505' && err.message.includes('inventory_items_hash_key');

                                if (isDuplicateHash) {
                                    // Duplicate item; silently skip
                                    processedRows++;
                                    await saveBulkStatus(processId, {
                                        status: "processing",
                                        processedRows,
                                        totalRows,
                                        percentage: ((processedRows / totalRows) * 100).toFixed(2),
                                    });
                                    itemId = null;
                                    break;
                                }

                                if (isDuplicateId) {
                                    // Existing item: perform UPDATE instead
                                    await client.query('BEGIN');

                                    const updateQuery = `
                                        UPDATE inventory_items SET
                                            name = $2,
                                            stock = $3,
                                            min_stock = $4,
                                            buy_price = $5,
                                            sale_price = $6,
                                            barcode = $7,
                                            sold = $8,
                                            hash = $9
                                        WHERE id = $1
                                        RETURNING id;
                                    `;

                                    const updateResult = await client.query(updateQuery, [
                                        itemId,
                                        name,
                                        parseInt(stock),
                                        parseInt(min_stock),
                                        parseFloat(buy_price),
                                        parseFloat(sale_price),
                                        modifiedBarcode,
                                        parseInt(sold),
                                        itemHash
                                    ]);

                                    itemId = updateResult.rows[0]?.id ?? null;
                                    await client.query('COMMIT');
                                    break;
                                }

                                if (!isDuplicateBarcode) throw err;

                                attempt++;
                                modifiedBarcode = `${barcode}-${Math.random().toString(36).substring(2, 6)}`;
                                coreItemData.barcode = modifiedBarcode;
                            }
                        }

                        if (!itemId) continue;

                        // Delete existing metadata if updating
                        await client.query(`DELETE FROM inventory_item_metadata WHERE item_id = $1;`, [itemId]);

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

                        await client.query('COMMIT');

                        insertedIds.push(itemId);
                        processedRows++;

                        await saveBulkStatus(processId, {
                            status: "processing",
                            processedRows,
                            totalRows,
                            percentage: ((processedRows / totalRows) * 100).toFixed(2),
                        });

                    } catch (error) {
                        await client.query('ROLLBACK');
                        await saveBulkStatus(processId, {
                            status: "failed",
                            message: `Insert failed in file ${file.originalname}, row ${rowIndex + 1}: ${error.message}`,
                            percentage: ((processedRows / totalRows) * 100).toFixed(2),
                            processedRows,
                            totalRows,
                        });
                        return;
                    }
                }
            }

            await saveBulkStatus(processId, {
                status: "completed",
                percentage: 100,
                processedRows,
                totalRows,
                insertedIds,
            });

        } catch (err) {
            await saveBulkStatus(processId, {
                status: "failed",
                message: "Unexpected error: " + err.message,
            });
        } finally {
            client.release();
        }
    })();
};
