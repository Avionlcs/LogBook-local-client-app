const express = require("express");
const router = express.Router();
const db = require("../config/dbConfig");
const { addData, parseExcelFile, addBulkData, HashSearch, removeDuplicates } = require("../utils/dbUtils");
const { multiUpload } = require("../config/multerConfig");
const CryptoJS = require("crypto-js");
const { v4: uuidv4 } = require('uuid');
const { hash } = require("bcrypt");
const { saveBulkStatus, getBulkStatus } = require("../utils/bulkProcessStatus");

router.post("/add/:entity", async (req, res) => {
    try {
        const { entity } = req.params;
        var data = req.body;
        data.user = req.user ? req.user.id : "system";
        const result = await addData(entity, data, true);
        res.json(result);
    } catch (error) {
        res.status(500).send("Error: " + error.message);
    }
});

const bulkProcessStatus = {};

function validateRow(row, schema) {
    const errors = [];

    for (const key in schema) {
        const rules = schema[key];
        const value = row[key];

        // Required check
        if (rules.required && (value === undefined || value === null || value === "")) {
            errors.push(`${key} is required`);
            continue;
        }

        // Skip further checks if value is missing and not required
        if (value === undefined || value === null || value === "") continue;

        // Type check
        if (rules.type) {
            if (rules.type === "number" && isNaN(Number(value))) {
                errors.push(`${key} must be a number`);
            } else if (rules.type === "string" && typeof value !== "string") {
                errors.push(`${key} must be a string`);
            }
        }

        // Min/Max validation
        if (rules.min !== undefined) {
            if (rules.type === "string" && value.length < rules.min) {
                errors.push(`${key} must be at least ${rules.min} characters`);
            } else if (rules.type === "number" && Number(value) < rules.min) {
                errors.push(`${key} must be >= ${rules.min}`);
            }
        }

        if (rules.max !== undefined) {
            if (rules.type === "string" && value.length > rules.max) {
                errors.push(`${key} must be at most ${rules.max} characters`);
            } else if (rules.type === "number" && Number(value) > rules.max) {
                errors.push(`${key} must be <= ${rules.max}`);
            }
        }

        // Pattern (e.g., email)
        if (rules.pattern === "email") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                errors.push(`${key} must be a valid email`);
            }
        }
    }

    return errors;
}

router.post("/add/bulk/:entity", multiUpload, async (req, res) => {
    try {
        var { entity } = req.params;

        // Validate file upload
        if (!req.files || req.files.length === 0) {
            return res.status(400).send({ error: "No file uploaded" });
        }

        // Parse required fields from body
        let requiredFields = {};
        if (req.body.requiredFields) {
            requiredFields =
                typeof req.body.requiredFields === "string"
                    ? JSON.parse(req.body.requiredFields)
                    : req.body.requiredFields;
        }

        // Generate unique process ID
        const processId = uuidv4();

        // Respond immediately
        res.json({ processId });

        // Process asynchronously
        (async () => {
            let allResults = [];
            let insertedIds = [];

            try {
                // Calculate total rows from all files
                let totalRows = req.files.reduce((sum, file) => {
                    const dataArray = parseExcelFile(file.path);
                    return sum + dataArray.length;
                }, 0);

                // Save initial status with totalRows
                await saveBulkStatus(processId, {
                    percentage: 0,
                    status: "processing",
                    totalRows,
                    processedRows: 0
                });

                let processedRows = 0;

                for (const file of req.files) {
                    const dataArray = parseExcelFile(file.path);

                    let rowIndex = 0;
                    for (var row of dataArray) {
                        rowIndex++;

                        // Skip empty rows
                        if (Object.keys(row).length === 0) continue;

                        // Validate row
                        const validationErrors = validateRow(row, requiredFields);
                        if (validationErrors.length > 0) {
                            await saveBulkStatus(processId, {
                                status: "failed",
                                message: `Validation failed in file "${file.originalname}", row ${rowIndex + 1}: ${validationErrors.join(", ")}`,
                                percentage: ((processedRows / totalRows) * 100).toFixed(2),
                                totalRows
                            });

                            // Rollback inserted rows
                            for (const id of insertedIds) {
                                await deleteItem(entity, id);
                            }
                            return;
                        }

                        // Insert row
                        try {
                            row.user = req.user ? req.user.id : "system";
                            const result = await addData(entity, row, true);
                            if (result && result.id) insertedIds.push(result.id);

                            allResults.push({ row, status: "success", result });
                        } catch (err) {
                            await saveBulkStatus(processId, {
                                status: "failed",
                                message: `Insert failed in file "${file.originalname}", row ${rowIndex + 1}: ${err.message}`,
                                percentage: ((processedRows / totalRows) * 100).toFixed(2),
                                totalRows
                            });

                            for (const id of insertedIds) {
                                await deleteItem(entity, id);
                            }
                            return;
                        }

                        // Update progress
                        processedRows++;
                        await saveBulkStatus(processId, {
                            status: "processing",
                            percentage: ((processedRows / totalRows) * 100).toFixed(2),
                            processedRows,
                            totalRows
                        });
                    }
                }

                // Completed
                await saveBulkStatus(processId, {
                    status: "completed",
                    percentage: 100,
                    results: allResults,
                    totalRows
                });
            } catch (err) {
                await saveBulkStatus(processId, {
                    status: "failed",
                    message: `Unexpected error - ${err.message}`,
                });

                for (const id of insertedIds) {
                    await deleteItem(entity, id);
                }
            }
        })();
    } catch (error) {
        res.status(500).send("Error: " + error.message);
    }
});

router.get("/bulk/status/:processId", async (req, res) => {
    try {
        const { processId } = req.params;
        const status = await getBulkStatus(processId);
        if (!status) {
            return res.status(404).send({ error: "Process not found" });
        }
        res.json(status);
    } catch (error) {
        res.status(500).send({ error: "Failed to get bulk status", details: error.message });
    }
});

router.get("/search", async (req, res) => {
    const { keyword, schema, filterBy, limit } = req.query;
    try {
        const results = await HashSearch(keyword, schema, filterBy, parseInt(limit, 10));
        res.json(results);
    } catch (error) {
        console.log("Error searching:", error);

        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/read-multiple/timeframe/:entity/:start/:end", async (req, res) => {
    let { entity, start, end } = req.params;

    start = !isNaN(Date.parse(start)) ? start : undefined;
    end = !isNaN(Date.parse(end)) ? end : undefined;

    try {
        const rows = await db.getEntities(entity, start, end);
        console.log(`Fetched ${rows.length} items for entity: ${entity} from ${start} to ${end}`);

        res.status(200).send(rows);
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send({ error: "Error processing request", details: error.message });
    }
});

router.get("/read-multiple/range/:entity/:start/:end", async (req, res) => {
    let { entity, start, end } = req.params;
    console.log(`Fetching entities for ${entity} with range ${start} to ${end}`);

    try {
        const rows = await db.getEntitiesRange(entity, start, end);
        console.log(`Fetched ${rows.length} items for entity: ${entity} from ${start} to ${end}`);

        res.status(200).send(rows);
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send({ error: "Error processing request", details: error.message });
    }
});

router.get("/read/:entity/:id", async (req, res) => {
    const { entity, id } = req.params;
    try {
        const key = `${entity}:${id}`;
        const item = await db.get(key).catch(() => null);
        if (!item) return res.status(404).send({ error: "Item not found" });
        res.send(JSON.parse(item));
    } catch (error) {
        console.log("Error fetching item:", error);

        res.status(500).send({ error: "Error fetching item", details: error });
    }
});

router.get("/read_key_value/:entity/search/:key/:value", async (req, res) => {
    const { entity, key, value } = req.params;
    try {
        const results = await db.searchByEntityKeyValue(entity, key, value);
        res.send(results);
    } catch (error) {
        res.status(500).send({ error: "Error processing request", details: error.message });
    }
});

router.put("/update/:entity/:id", async (req, res) => {
    const { entity, id } = req.params;
    const localDate = new Date();
    const datePart = localDate.toLocaleDateString('en-US');
    const timePart = localDate.toLocaleTimeString('en-US', { hour12: false });
    var t = `${datePart} ${timePart}`;
    var updatedItem = { ...req.body, last_updated: t };

    updatedItem.user = req.user ? req.user.id : "system";
    if (updatedItem.password) {
        updatedItem.password = await hash(updatedItem.password + 'ems&sort_by=sold&limit=20', 10);
    }
    try {
        const key = `${entity}:${id}`;
        const result = await db.get(key);
        const existingItem = result ? JSON.parse(result.toString("utf-8")) : null;
        if (!existingItem) return res.status(404).send({ error: "Item not found" });
        await db.put(key, JSON.stringify(updatedItem));
        let updatedHashes = [];
        for (let [key, value] of Object.entries(updatedItem)) {
            const oldValue = existingItem[key];
            if (oldValue && oldValue != value) {
                updatedHashes.push(key);
                let valuies = oldValue.toString().toLowerCase().split(" ");
                for (const element3 of valuies) {
                    const hashedText = CryptoJS.SHA256(element3.replace(/[,.]/g, "")).toString();
                    let hs = await db.get("HashData:" + hashedText).then((data) => JSON.parse(data.toString("utf-8"))).catch(() => null);
                    if (hs) {
                        hs[oldValue] = hs[oldValue] || {};
                        hs[oldValue][entity] = hs[oldValue][entity] || {};
                        hs[oldValue][entity][key] = hs[oldValue][entity][key] || [];
                        const index = hs[oldValue][entity][key].indexOf(id);
                        if (index > -1) hs[oldValue][entity][key].splice(index, 1);
                        await db.put("HashData:" + hashedText, JSON.stringify(hs));
                    }
                }
            }
        }
        for (const key of updatedHashes) {
            await require("../utils/dbUtils").makeHash(updatedItem[key], key, entity, id);
        }
        res.send({ message: `Item updated successfully in ${entity}`, updatedItem });
    } catch (error) {
        console.error("Error updating item:", error);
        res.status(500).send({ error: "Error updating item", details: error });
    }
});

async function deleteItem(entity, id) {
    const key = `${entity}:${id}`;

    try {
        const result = await db.get(key);
        const existingItem = result ? JSON.parse(result.toString("utf-8")) : null;

        if (!existingItem) {
            return { success: false, message: "Item not found" };
        }

        // Remove hashed references
        for (const [fieldKey, value] of Object.entries(existingItem)) {
            let values = value.toString().toLowerCase().split(" ");

            for (const word of values) {
                const hashedText = CryptoJS.SHA256(word.replace(/[,.]/g, "")).toString();

                let hs = await db
                    .get("HashData:" + hashedText)
                    .then((data) => JSON.parse(data.toString("utf-8")))
                    .catch(() => null);

                if (hs) {
                    hs[value] = hs[value] || {};
                    hs[value][entity] = hs[value][entity] || {};
                    hs[value][entity][fieldKey] = hs[value][entity][fieldKey] || [];

                    const index = hs[value][entity][fieldKey].indexOf(id);
                    if (index > -1) hs[value][entity][fieldKey].splice(index, 1);

                    await db.put("HashData:" + hashedText, JSON.stringify(hs));
                }
            }
        }

        // Delete the item
        await db.del(key);

        return { success: true, message: `Item deleted successfully from ${entity}` };
    } catch (error) {
        return { success: false, message: "Error deleting item", error };
    }
}

router.delete("/delete/:entity/:id", async (req, res) => {
    const { entity, id } = req.params;
    const result = await deleteItem(entity, id);

    if (!result.success) {
        return res.status(result.message === "Item not found" ? 404 : 500).send(result);
    }

    res.send({ message: result.message });
});

module.exports = router;