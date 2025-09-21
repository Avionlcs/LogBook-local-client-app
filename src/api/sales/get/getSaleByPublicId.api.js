// src/api/sales/get/getSaleByPublicId.api.js
const db = require("../../../config/dbConfig");

const getSaleByPublicId = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const sale_public_id =
            req.params.sale_public_id ||
            req.query.sale_public_id ||
            req.body.sale_public_id;

        if (!sale_public_id) {
            return res.status(400).json({
                success: false,
                error: "sale_public_id is required",
            });
        }

        // 1) Fetch the sale
        const saleResult = await client.query(
            `SELECT * FROM sales WHERE public_id = $1::text OR id::text = $1::text`,
            [String(sale_public_id)]
        );


        if (saleResult.rowCount === 0) {
            return res
                .status(404)
                .json({ success: false, error: "Sale not found" });
        }

        const sale = saleResult.rows[0];

        // 2) Fetch related sale_items (joined with inventory details if needed)
        const itemsResult = await client.query(
            `SELECT si.*, 
              i.name AS item_name, 
              i.barcode, 
              i.sale_price AS current_price
         FROM sale_items si
         JOIN inventory_items i ON si.item_id = i.id
        WHERE si.sale_public_id = $1
        ORDER BY si.created_at ASC`,
            [sale_public_id]
        );

        // 3) Fetch related sale_offers
        const offersResult = await client.query(
            `SELECT * 
         FROM sale_offers 
        WHERE sale_public_id = $1
        ORDER BY created_at ASC`,
            [sale_public_id]
        );

        // 4) Attach nested objects
        sale.items = itemsResult.rows;
        sale.offers = offersResult.rows;

        return res.status(200).json({ success: true, sale });
    } catch (error) {
        console.error("Error fetching sale:", error);
        return res
            .status(500)
            .json({ success: false, error: "Internal server error" });
    } finally {
        client.release();
    }
};

module.exports = { getSaleByPublicId };
