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

        const items = await db.getEntitiesSorted(entity, sortBy, limit);
        res.status(200).json(items);
    } catch (error) {
        console.error("Error in /sort_by handler:", error);
        res.status(500).send({ error: "Error processing request", details: error.message });
    }
});

async function processDashboardData(startDate, endDate, rows) {
    return new Promise((resolve, reject) => {
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
            for (const row of rows) {

                let entityType, id;
                try {
                    [entityType, id] = row.key.split(":");
                    if (!entityType || !id) {
                        console.warn(`Invalid key format in row: ${row.key}`);
                        continue;
                    }
                } catch (err) {
                    console.warn(`Error splitting key ${row.key}:`, err.message);
                    continue;
                }

                if (entityType === "sales" || entityType === "inventory_items") {
                    if (!row?.key || !row?.value) {
                        console.warn(`Skipping invalid row: `);
                        continue;
                    }

                    let item;
                    try {
                        item = JSON.parse(row.value);
                        if (!item || typeof item !== 'object') {
                            console.warn('Parsed value is not an object');
                        }
                    } catch (parseError) {
                        console.warn(`Error parsing value for key ${row.key}:`, parseError.message);
                        continue;
                    }

                    if (entityType === "sales") {
                        if (!item.created || item.total == null || isNaN(item.total)) {
                            console.warn(`Invalid sales data for key ${row.key}:`, item);
                            continue;
                        }
                        const saleDate = new Date(item.created);
                        if (isNaN(saleDate.getTime())) {
                            console.warn(`Invalid sale date for key ${row.key}:`, item.created);
                            continue;
                        }
                        if (saleDate >= startDate && saleDate <= endDate) {
                            response.sales.quantity += 1;
                            response.sales.totalValue += Number(item.total);
                        }
                    } else if (entityType === "inventory_items") {
                        if (
                            item.stock == null ||

                            item.sale_price == null ||
                            item.buy_price == null ||
                            isNaN(item.stock) ||

                            isNaN(item.sale_price) ||
                            isNaN(item.buy_price)
                        ) {
                            console.warn(`Invalid inventory data for key ${row.key}:`);
                            continue;
                        }
                        const availableStock = item.stock - (item.sold ?? 0);
                        if (availableStock > 0) {
                            response.products.inStock.stock_count += availableStock;
                            response.products.inStock.variations_count += 1;
                            response.products.inStock.value += item.sale_price * availableStock;
                        }
                        if (availableStock <= (item.min_stock ?? 0)) {
                            response.products.lowStock.quantity += 1;
                            response.products.lowStock.value += item.sale_price * availableStock;
                        }
                        if (availableStock <= 0) {
                            response.products.outOfStock.quantity += 1;
                            response.products.outOfStock.value += item.buy_price * (item.min_stock ?? 1);
                        }
                    }
                }
            }

            response.sales.average = response.sales.quantity
                ? response.sales.totalValue / response.sales.quantity
                : 0;
            resolve(response);
        } catch (error) {
            console.error('Error processing dashboard data:', error);
            reject(error);
        }
    });
}

router.get("/dashboard_info/:from/:to", async (req, res) => {
    const { from, to } = req.params;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = from ? new Date(from) : new Date(today.setDate(today.getDate() - 1));
    const endDate = to ? new Date(to) : new Date(today.setDate(today.getDate() + 2));

    if (from && isNaN(startDate.getTime())) {
        return res.status(400).json({ error: "Invalid 'from' date format" });
    }
    if (to && isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid 'to' date format" });
    }

    endDate.setHours(23, 59, 59, 999);

    try {
        const salesRows = await db.getEntities("sales");
        const inventoryRows = await db.getEntities("inventory_items");

        const rows = [...salesRows, ...inventoryRows];

        const response = await processDashboardData(startDate, endDate, rows);
        res.status(200).json(response);
    } catch (error) {
        console.error("Error processing dashboard info:", error);
        res.status(500).json({ error: "Error processing dashboard info", details: error.message });
    }
});


module.exports = router;