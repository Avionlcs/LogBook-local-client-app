// src/api/sales/helpers/getSaleWithRelations.js
module.exports = async (pool, public_id) => {
    const client = await pool.connect();
    try {
        const saleRes = await client.query(
            "SELECT * FROM sales WHERE public_id=$1",
            [public_id]
        );
        const sale = saleRes.rows[0];
        if (!sale) return null;

        const itemsRes = await client.query(
            "SELECT * FROM sale_items WHERE sale_public_id=$1 ORDER BY id",
            [public_id]
        );
        const paymentsRes = await client.query(
            "SELECT * FROM sale_payments WHERE sale_public_id=$1 ORDER BY id",
            [public_id]
        );
        const offersRes = await client.query(
            "SELECT * FROM sale_offers WHERE sale_public_id=$1 ORDER BY id",
            [public_id]
        );

        return {
            ...sale,
            items: itemsRes.rows,
            payments: paymentsRes.rows,
            offers: offersRes.rows
        };
    } finally {
        client.release();
    }
};
