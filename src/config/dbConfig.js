const express = require("express");
const levelup = require("levelup");
const leveldown = require("leveldown");
const path = require("path");
const { existsSync, unlinkSync } = require("fs");

const isPkg = typeof process.pkg !== "undefined";
const basePath = isPkg ? path.dirname(process.execPath) : __dirname;
const dbPath = path.join(basePath, "../data");
const lockFilePath = path.join(dbPath, "LOCK");

const clearLockFile = () => {
    if (existsSync(lockFilePath)) {
        unlinkSync(lockFilePath);
    }
};

clearLockFile();

const db = levelup(leveldown(dbPath));
const app = express();
app.use(express.json());

// GET value by key
app.get("/api/db/:key", async (req, res) => {
    try {
        const value = await db.get(req.params.key);
        res.json({ key: req.params.key, value: value.toString() });
    } catch (err) {
        res.status(404).json({ error: "Key not found" });
    }
});

// GET many values by keys
app.post("/api/db/getMany", async (req, res) => {
    try {
        const values = await db.getMany(req.body.keys);
        res.json({ keys: req.body.keys, values: values.map(v => v && v.toString()) });
    } catch (err) {
        res.status(404).json({ error: "Keys not found" });
    }
});

// PUT value by key
app.put("/api/db/:key", async (req, res) => {
    try {
        await db.put(req.params.key, req.body.value);
        res.json({ message: "Value stored" });
    } catch (err) {
        res.status(500).json({ error: "Failed to store value" });
    }
});

// DELETE key
app.delete("/api/db/:key", async (req, res) => {
    try {
        await db.del(req.params.key);
        res.json({ message: "Key deleted" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete key" });
    }
});

// CLEAR database (optionally with range)
app.post("/api/db/clear", async (req, res) => {
    try {
        await db.clear(req.body.options || {});
        res.json({ message: "Database cleared" });
    } catch (err) {
        res.status(500).json({ error: "Failed to clear database" });
    }
});

// BATCH operations
app.post("/api/db/batch", async (req, res) => {
    try {
        await db.batch(req.body.operations);
        res.json({ message: "Batch operation successful" });
    } catch (err) {
        res.status(500).json({ error: "Batch operation failed" });
    }
});

// OPEN database
app.post("/api/db/open", async (req, res) => {
    try {
        await db.open();
        res.json({ message: "Database opened" });
    } catch (err) {
        res.status(500).json({ error: "Failed to open database" });
    }
});

// CLOSE database
app.post("/api/db/close", async (req, res) => {
    try {
        await db.close();
        res.json({ message: "Database closed" });
    } catch (err) {
        res.status(500).json({ error: "Failed to close database" });
    }
});

// READ STREAM (all keys/values)
app.get("/api/db", (req, res) => {
    const results = [];
    db.createReadStream(req.query)
        .on("data", (data) => {
            results.push({ key: data.key.toString(), value: data.value.toString() });
        })
        .on("error", (err) => {
            res.status(500).json({ error: "Read stream failed" });
        })
        .on("end", () => {
            res.json(results);
        });
});

// KEY STREAM
app.get("/api/db/keys", (req, res) => {
    const results = [];
    db.createKeyStream(req.query)
        .on("data", (key) => {
            results.push(key.toString());
        })
        .on("error", (err) => {
            res.status(500).json({ error: "Key stream failed" });
        })
        .on("end", () => {
            res.json(results);
        });
});

// VALUE STREAM
app.get("/api/db/values", (req, res) => {
    const results = [];
    db.createValueStream(req.query)
        .on("data", (value) => {
            results.push(value.toString());
        })
        .on("error", (err) => {
            res.status(500).json({ error: "Value stream failed" });
        })
        .on("end", () => {
            res.json(results);
        });
});

const PORT = process.env.PORT || 5200;

app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});