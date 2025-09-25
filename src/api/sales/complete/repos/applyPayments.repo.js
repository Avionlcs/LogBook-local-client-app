
// Aggregate into sales row
module.exports = (c, id, p) => {
  let cash = 0, card = 0, qr = 0, cardRef = null, qrRef = null;
  
  for (const x of p) {
    if (x.method === "cash") {
      cash += +x.amount;
    } else if (x.method === "card") {
      card += +x.amount;
      cardRef = x.reference || cardRef;
    } else {
      qr += +x.amount;
      qrRef = x.reference || qrRef;
    }
  }
  
  const q = `
    UPDATE sales SET 
      cash_payment_amount = cash_payment_amount + $2::NUMERIC(12,2),
      card_payment_amount = card_payment_amount + $3::NUMERIC(12,2),
      qr_payment_amount = qr_payment_amount + $4::NUMERIC(12,2),
      card_payment_reference = COALESCE($5, card_payment_reference),
      qr_payment_reference = COALESCE($6, qr_payment_reference),
      updated_at = NOW() 
    WHERE public_id = $1 
    RETURNING *`;
    
  return c.query(q, [id, cash, card, qr, cardRef, qrRef]).then(r => r.rows[0]);
};
