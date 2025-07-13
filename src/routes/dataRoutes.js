const express = require("express");
const router = express.Router();
const db = require("../config/dbConfig");
const { addData, parseExcelFile, addBulkData, HashSearch, removeDuplicates } = require("../utils/dbUtils");
const { multiUpload } = require("../config/multerConfig");
const CryptoJS = require("crypto-js");
const { v4: uuidv4 } = require('uuid');
const { hash } = require("bcrypt");

router.post("/add/:entity", async (req, res) => {
    try {
        const { entity } = req.params;
        const data = req.body;
        const result = await addData(entity, data, true);
        res.json(result);
    } catch (error) {
        res.status(500).send("Error: " + error.message);
    }
});

// Store process status in-memory (for demo; use Redis or DB for production)
const bulkProcessStatus = {};

// Bulk upload route with status tracking
router.post("/add/bulk/:entity", multiUpload, async (req, res) => {
    try {
        const { entity } = req.params;
        if (!req.files || req.files.length === 0) {
            return res.status(400).send({ error: "No file uploaded" });
        }
        // Generate a unique process ID
        const processId = uuidv4();
        bulkProcessStatus[processId] = { percentage: 0, status: "processing" };
        console.log(`Bulk upload started for entity: ${entity}, Process ID: ${processId}`);

        // Respond immediately with processId
        res.json({ processId });

        // Process files asynchronously
        (async () => {
            let allResults = [];
            // First, calculate totalRows across all files
            let totalRows = req.files.reduce((sum, file) => {
                const dataArray = parseExcelFile(file.path);
                return sum + dataArray.length;
            }, 0);
            bulkProcessStatus[processId].totalRows = totalRows;
            let processedRows = 0;
            for (const file of req.files) {
                const dataArray = parseExcelFile(file.path);
                for (const row of dataArray) {
                    try {
                        const result = await addBulkData(entity, [row], true);
                        allResults.push(result);
                    } catch (err) {
                        // Optionally log error per row
                    }
                    processedRows++;
                    bulkProcessStatus[processId].percentage = ((processedRows / totalRows) * 100).toFixed(2);
                    bulkProcessStatus[processId].processedRows = processedRows;
                }
            }
            bulkProcessStatus[processId].status = "completed";
            bulkProcessStatus[processId].percentage = 100;
            bulkProcessStatus[processId].results = allResults;
        })();
    } catch (error) {
        res.status(500).send("Error: " + error.message);
    }
});

// Endpoint to get bulk process status
router.get("/bulk/status/:processId", (req, res) => {
    const { processId } = req.params;
    const status = bulkProcessStatus[processId];
    if (!status) {
        return res.status(404).send({ error: "Process not found" });
    }
    res.json(status);
});

router.get("/search", async (req, res) => {
    const { keyword, schema, filterBy, limit } = req.query;
    try {
        const results = await HashSearch(keyword, schema, filterBy, parseInt(limit, 10));
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/read/:entity/:start/:end", async (req, res) => {
    let { entity, start, end } = req.params;
    start = parseInt(start, 10) || 0;
    end = parseInt(end, 10) || 50;

    try {
        // Fetch all rows from kv_store
        const rows = await db.createReadStream();
        const results = [];
        let currentIndex = 0;

        // Filter and process rows
        for (const row of rows) {
            const [storedEntity] = row.key.split(":");
            if (storedEntity === entity) {
                if (currentIndex >= start && currentIndex < end) {
                    try {
                        results.push(JSON.parse(row.value));
                    } catch (parseError) {
                        //   console.error(`Error parsing value for key ${row.key}:`, parseError.message);
                        // Optionally skip or handle malformed JSON
                    }
                }
                currentIndex++;
            }
        }

        res.status(200).send(results);
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
    let results = [];
    try {
        await db.createReadStream()
            .on("data", (data) => {
                const [storedEntity, id] = data.key.split(":");
                const item = JSON.parse(data.value);
                if (storedEntity === entity && item[key] === value) results.push(item);
            })
            .on("end", () => res.send(results))
            .on("error", (error) =>
                res.status(500).send({ error: "Error fetching data", details: error })
            );
    } catch (error) {
        res.status(500).send({ error: "Error processing request", details: error });
    }
});

router.put("/update/:entity/:id", async (req, res) => {
    const { entity, id } = req.params;
    const updatedItem = { ...req.body, lastUpdated: new Date().toISOString() };
    if (updatedItem.password) {
        updatedItem.password = await hash(updatedItem.password + 'ems&sort_by=sold&limit=20', 10); // Hash the password if it exists
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

router.delete("/delete/:entity/:id", async (req, res) => {
    const { entity, id } = req.params;
    try {
        const key = `${entity}:${id}`;
        const result = await db.get(key);
        const existingItem = result ? JSON.parse(result.toString("utf-8")) : null;
        if (!existingItem) return res.status(404).send({ error: "Item not found" });
        for (const [key, value] of Object.entries(existingItem)) {
            let valuies = value.toString().toLowerCase().split(" ");
            for (const element3 of valuies) {
                const hashedText = CryptoJS.SHA256(element3.replace(/[,.]/g, "")).toString();
                let hs = await db.get("HashData:" + hashedText).then((data) => JSON.parse(data.toString("utf-8"))).catch(() => null);
                if (hs) {
                    hs[value] = hs[value] || {};
                    hs[value][entity] = hs[value][entity] || {};
                    hs[value][entity][key] = hs[value][entity][key] || [];
                    const index = hs[value][entity][key].indexOf(id);
                    if (index > -1) hs[value][entity][key].splice(index, 1);
                    await db.put("HashData:" + hashedText, JSON.stringify(hs));
                }
            }
        }
        await db.del(key);
        res.send({ message: `Item deleted successfully from ${entity}` });
    } catch (error) {
        res.status(500).send({ error: "Error deleting item", details: error });
    }
});

module.exports = router;