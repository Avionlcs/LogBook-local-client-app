const express = require("express");
const router = express.Router();
const { encrypt } = require("../utils/cryptoUtils");
const db = require("../config/dbConfig");

router.post("/encrypt-float50f06efb2409b93c284", (req, res) => {
    const { input, key } = req.body;
    if (isNaN(input)) {
        return res.status(400).json({ error: "Invalid input. A number is required." });
    }
    const encryptedText = encrypt(input, key);
    if (encryptedText.length < 32) {
        return res.status(500).json({ error: "Encryption failed. Length is less than 32 characters." });
    }
    res.json({ encrypted: encryptedText });
});

router.get("/sort_by", async (req, res) => {
    try {
        const entity = req.query.entity || "Inventory";
        const sortBy = req.query.sort_by || "sold";
        const limit = parseInt(req.query.limit) || 20;

        const rows = await db.createReadStream();
        const items = [];

        for (const row of rows) {
            const [storedEntity] = row.key.split(":");
            if (storedEntity === entity) {
                try {
                    items.push(JSON.parse(row.value));
                } catch (parseError) {
                    console.error(`Error parsing value for key ${row.key}:`, parseError.message);
                }
            }
        }

        items.sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
        res.status(200).json(items.slice(0, limit));
    } catch (error) {
        console.error("Error in /sort_by handler:", error);
        res.status(500).send({ error: "Error processing request", details: error.message });
    }
});

router.get("/dashboard_info/:from?/:to", async (req, res) => {
    const { from, to } = req.params;
    const today = new Date();
    const defaultFrom = new Date(today.setDate(today.getDate() - 1));
    const defaultTo = new Date(today.setDate(today.getDate() + 2));
    const startDate = from ? new Date(from) : defaultFrom;
    const endDate = to ? new Date(to) : defaultTo;
    const response = {
        stamp: { from: startDate, to: endDate, timeStamp: Date.now() },
        sales: { quantity: 0, totalValue: 0, average: 0 },
        products: {
            inStock: { variations_count: 0, stock_count: 0, value: 0 },
            lowStock: { quantity: 0, value: 0 },
            outOfStock: { quantity: 0, value: 0 },
        },
    };
    try {
        db.createReadStream()
            .on("data", (data) => {
                try {
                    const [entityType, id] = data.key.toString().split(":");
                    const item = JSON.parse(data.value.toString());
                    if (entityType === "sales") {
                        const saleDate = new Date(item.created);
                        if (saleDate >= startDate && saleDate <= endDate) {
                            response.sales.quantity += 1;
                            response.sales.totalValue += item.total;
                        }
                    }
                    if (entityType === "inventory_items") {
                        const availableStock = item.stock - item.sold;
                        if (availableStock > 0) {
                            response.products.inStock.stock_count += availableStock;
                            response.products.inStock.variations_count += 1;
                            response.products.inStock.value += item.salePrice * availableStock;
                        }
                        if (availableStock <= item.min_stock) {
                            response.products.lowStock.quantity += 1;
                            response.products.lowStock.value += item.salePrice * availableStock;
                        }
                        if (availableStock <= 0) {
                            response.products.outOfStock.quantity += 1;
                            response.products.outOfStock.value += item.buyPrice * (item.min_stock || 1);
                        }
                    }
                } catch (parseError) {

                }
            })
            .on("end", () => {
                response.sales.average = response.sales.quantity ? response.sales.totalValue / response.sales.quantity : 0;
                res.status(200).json(response);
            })
            .on("error", (error) => {
                console.error("Error during read stream:", error);
                res.status(500).json({ error: "Error reading data from the database", details: error.message });
            });
    } catch (error) {
        console.error("Error processing dashboard info:", error);
        res.status(500).json({ error: "Error processing dashboard info", details: error.message });
    }
});

module.exports = router;