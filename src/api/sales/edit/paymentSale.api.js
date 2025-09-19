const db = require("../../../config/dbConfig");

const paymentSale = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const {
            sale_id,
            card_payment_amount = 0,
            card_payment_reference = null,
            cash_payment_amount = 0,
            qr_payment_amount = 0,
            qr_payment_reference = null,
            loyalty_claimed_amount = 0,
            loyalty_reference = null,
            total_offer_discount = 0,
        } = req.body;

        if (!sale_id) {
            return res.status(400).json({ success: false, error: "sale_id is required" });
        }

        // Normalize payment amounts as floats
        const cardAmt = parseFloat(card_payment_amount) || 0;
        const cashAmt = parseFloat(cash_payment_amount) || 0;
        const qrAmt = parseFloat(qr_payment_amount) || 0;
        const loyaltyAmt = parseFloat(loyalty_claimed_amount) || 0;
        const offerDiscount = parseFloat(total_offer_discount) || 0;

        await client.query("BEGIN");

        // Fetch sale record for update
        const saleResult = await client.query("SELECT * FROM sales WHERE id = $1 FOR UPDATE", [sale_id]);
        if (saleResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, error: "Sale not found" });
        }
        const sale = saleResult.rows[0];

        // Calculate new totals
        const new_card_amount = parseFloat(sale.card_payment_amount) + cardAmt;
        const new_cash_amount = parseFloat(sale.cash_payment_amount) + cashAmt;
        const new_qr_amount = parseFloat(sale.qr_payment_amount) + qrAmt;
        const new_loyalty_amount = parseFloat(sale.loyalty_claimed_amount) + loyaltyAmt;
        const total_paid_amount = new_card_amount + new_cash_amount + new_qr_amount + new_loyalty_amount;

        // Determine payment method automatically
        const paymentTypes = [];
        if (cardAmt > 0) paymentTypes.push("card");
        if (cashAmt > 0) paymentTypes.push("cash");
        if (qrAmt > 0) paymentTypes.push("qr");
        if (loyaltyAmt > 0) paymentTypes.push("loyalty");

        let payment_method = null;
        if (paymentTypes?.length === 1) {
            payment_method = paymentTypes[0];
        } else if (paymentTypes?.length > 1) {
            payment_method = "mixed";
        } else {
            payment_method = "none";
        }

        // Calculate effective total after discount
        const effective_total = parseFloat(sale.total_amount) - offerDiscount;

        // Determine new status (sold if fully paid)
        const new_status = total_paid_amount >= effective_total ? "sold" : "processing";

        // Update sale record
        await client.query(
            `UPDATE sales SET 
        card_payment_amount = $1,
        card_payment_reference = COALESCE($2, card_payment_reference),
        cash_payment_amount = $3,
        qr_payment_amount = $4,
        qr_payment_reference = COALESCE($5, qr_payment_reference),
        loyalty_claimed_amount = $6,
        loyalty_reference = COALESCE($7, loyalty_reference),
        total_paid_amount = $8,
        total_offer_discount = $9,
        payment_method = $10,
        status = $11,
        updated_at = NOW()
      WHERE id = $12`,
            [
                new_card_amount,
                card_payment_reference,
                new_cash_amount,
                new_qr_amount,
                qr_payment_reference,
                new_loyalty_amount,
                loyalty_reference,
                total_paid_amount,
                offerDiscount,
                payment_method,
                new_status,
                sale_id,
            ]
        );

        await client.query("COMMIT");

        res.status(200).json({ success: true, sale_id, status: new_status, payment_method });
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (_) { }
        console.error("Error processing sale payment:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    } finally {
        client.release();
    }
};

module.exports = { paymentSale };
