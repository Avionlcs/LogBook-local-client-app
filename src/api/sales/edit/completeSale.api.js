// completeSale.api.js
const db = require("../../../config/dbConfig");

const ALLOWED_METHODS = new Set(["cash", "card", "qr"]);
const MAX_PAYMENTS = 10;

// Simple 2dp validator for "money" strings/numbers
function isValidMoney(v) {
  if (v === null || v === undefined) return false;
  const s = String(v).trim();
  // up to 2 decimals, no plus/minus, no commas here (client should strip)
  return /^(\d+)(\.\d{1,2})?$/.test(s);
}

function toNum(v) {
  return Number(String(v).trim());
}

const completeSale = async (req, res) => {
  const pool = db.getPool();
  const client = await pool.connect();

  try {
    const { sale_public_id, payments, idempotency_key } = req.body || {};
    const acting_user_id = req.user?.id; // for audit (optional)

    // Basic shape checks
    if (!sale_public_id) {
      return res.status(400).json({ success: false, error: "sale_public_id is required" });
    }
    if (!Array.isArray(payments) || payments.length === 0 || payments.length > MAX_PAYMENTS) {
      return res.status(400).json({
        success: false,
        error: `payments must be a non-empty array (max ${MAX_PAYMENTS})`
      });
    }

    // Validate each payment row
    for (const p of payments) {
      if (!p || typeof p !== "object") {
        return res.status(400).json({ success: false, error: "Invalid payment object" });
      }
      if (!ALLOWED_METHODS.has(String(p.method || "").toLowerCase())) {
        return res.status(400).json({ success: false, error: "Unsupported payment method" });
      }
      if (!isValidMoney(p.amount) || toNum(p.amount) <= 0) {
        return res.status(400).json({ success: false, error: "Payment amount must be a positive number with up to 2 decimals" });
      }
      if (p.reference && String(p.reference).length > 128) {
        return res.status(400).json({ success: false, error: "Payment reference too long" });
      }
      if (p.currency && p.currency !== "LKR") {
        return res.status(400).json({ success: false, error: "Unsupported currency (only LKR)" });
      }
    }

    await client.query("BEGIN");
    await client.query("SET LOCAL TRANSACTION ISOLATION LEVEL REPEATABLE READ");

    // Optional idempotency: if a previous completion with this key exists, return it
    if (idempotency_key) {
      const idem = await client.query(
        `SELECT response_payload
           FROM sale_completion_idempotency
          WHERE sale_public_id = $1 AND idempotency_key = $2
          LIMIT 1`,
        [sale_public_id, idempotency_key]
      );
      if (idem.rowCount > 0) {
        await client.query("COMMIT");
        return res.status(200).json(idem.rows[0].response_payload);
      }
    }

    // Lock sale row
    const saleRes = await client.query(
      `SELECT *
         FROM sales
        WHERE public_id = $1
        FOR UPDATE`,
      [sale_public_id]
    );
    if (saleRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Sale not found" });
    }

    const sale = saleRes.rows[0];

    if (sale.status !== "processing") {
      await client.query("ROLLBACK");
      return res.status(409).json({ success: false, error: `Sale is in '${sale.status}' status` });
    }

    // Ensure it has items, and compute total in SQL (NUMERIC to avoid float)
    const itemsRes = await client.query(
      `SELECT id, item_id, quantity, unit_price, total_price
         FROM sale_items
        WHERE sale_public_id = $1`,
      [sale_public_id]
    );
    if (itemsRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: "Sale has no items" });
    }

    const totalsRes = await client.query(
      `SELECT
           COALESCE(SUM(total_price), 0)::NUMERIC(12,2) AS total_amount
         FROM sale_items
        WHERE sale_public_id = $1`,
      [sale_public_id]
    );
    const total_amount = toNum(totalsRes.rows[0].total_amount);

    // Sum payments in SQL via VALUES to ensure 2dp rounding consistently
    const valuesPlaceholders = payments
      .map((_, i) => `($${i + 1}::TEXT, $${payments.length + i + 1}::NUMERIC(12,2))`)
      .join(", ");

    // method, amount pairs for VALUES()
    const methodParams = payments.map(p => String(p.method).toLowerCase());
    const amountParams = payments.map(p => toNum(Number(p.amount).toFixed(2)));
    const sumParams = [...methodParams, ...amountParams];

    const sumSql = `
      WITH pay(method, amount) AS (
        VALUES ${valuesPlaceholders}
      )
      SELECT COALESCE(SUM(amount), 0)::NUMERIC(12,2) AS total_paid FROM pay;
    `;
    const sumRes = await client.query(sumSql, sumParams);
    const total_paid_amount = toNum(sumRes.rows[0].total_paid);

    if (total_paid_amount < total_amount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "Insufficient payment",
        required: Number(total_amount.toFixed(2)),
        paid: Number(total_paid_amount.toFixed(2))
      });
    }

    const change_due = Number((total_paid_amount - total_amount).toFixed(2));

    // Insert payments rows
    // Also store reference, currency (default LKR), meta (if provided)
    for (const p of payments) {
      await client.query(
        `INSERT INTO sale_payments
           (sale_public_id, method, amount, currency, reference, status, meta)
         VALUES
           ($1, $2, $3::NUMERIC(12,2), $4, $5, $6, $7)`,
        [
          sale_public_id,
          String(p.method).toLowerCase(),
          Number(Number(p.amount).toFixed(2)),
          p.currency || "LKR",
          p.reference || null,
          // If you support async capture for card/qr, you could use 'pending' and promote via webhook.
          // Here we treat completion as captured.
          "captured",
          p.meta ? JSON.stringify(p.meta) : null
        ]
      );
    }

    // Finalize sale
    const updated = await client.query(
      `UPDATE sales
          SET status = 'completed',
              total_amount = $2,
              total_paid_amount = $3,
              change_due = $4,
              completed_at = NOW(),
              updated_at = NOW(),
              completed_by_user_id = COALESCE($5, completed_by_user_id)
        WHERE public_id = $1
      RETURNING *`,
      [
        sale_public_id,
        Number(total_amount.toFixed(2)),
        Number(total_paid_amount.toFixed(2)),
        change_due,
        acting_user_id || null
      ]
    );

    const paymentsRes = await client.query(
      `SELECT id, method, amount, currency, reference, status, created_at
         FROM sale_payments
        WHERE sale_public_id = $1
        ORDER BY created_at ASC, id ASC`,
      [sale_public_id]
    );

    const response = {
      success: true,
      message: "Sale completed successfully",
      sale: {
        ...updated.rows[0],
        items: itemsRes.rows,
        payments: paymentsRes.rows,
      }
    };

    // Store idempotent response if key present
    if (idempotency_key) {
      await client.query(
        `INSERT INTO sale_completion_idempotency (sale_public_id, idempotency_key, response_payload)
         VALUES ($1, $2, $3)
         ON CONFLICT (sale_public_id, idempotency_key) DO NOTHING`,
        [sale_public_id, idempotency_key, response]
      );
    }

    await client.query("COMMIT");
    return res.status(200).json(response);
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch {}
    console.error("completeSale error:", err);
    return res.status(500).json({ success: false, error: "Internal server error" });
  } finally {
    client.release();
  }
};

module.exports = { completeSale };
