const { randomUUID } = require("crypto");
const db = require("../../../../config/dbConfig");
const { parseExcelFile } = require("../../../../utils/dbUtils");
const { saveBulkStatus } = require("../../../../utils/bulkProcessStatus");
const { makeHash } = require("../../../../config/tables/hash/helpers/makeHashes.helper");

module.exports = async (req, res) => {
    const pool = db.getPool();

    if (!req.files || req.files.length === 0) {
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
                totalRows += dataArray.length;
            }

            await saveBulkStatus(processId, {
                status: "processing",
                percentage: 0,
                totalRows,
                processedRows: 0,
            });

            for (const file of req.files) {
                const dataArray = parseExcelFile(file.path);

                for (let rowIndex = 0; rowIndex < dataArray.length; rowIndex++) {
                    const item = dataArray[rowIndex];
                    if (!item || Object.keys(item).length === 0) continue;

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

                    try {
                        // Retry insert if barcode is duplicate
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
                                await client.query('COMMIT');
                                break; // Success, exit loop
                            } catch (err) {
                                const isDup = err.code === '23505' && err.message.includes('inventory_items_barcode_key');
                                await client.query('ROLLBACK');

                                if (!isDup) throw err;

                                // Try again with modified barcode
                                modifiedBarcode = `${barcode}-${Math.random().toString(36).substring(2, 6)}`;
                                attempt++;
                            }
                        }

                        if (!itemId) {
                            throw new Error(`Barcode duplication failed after ${MAX_ATTEMPTS} attempts`);
                        }

                        // Insert metadata and hash
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