// Rebuild payments from aggregates
module.exports=async(c,id)=>{
  const r=await c.query("SELECT cash_payment_amount,card_payment_amount,qr_payment_amount,card_payment_reference,qr_payment_reference FROM sales WHERE public_id=$1",[id]);
  const x=r.rows[0]||{};const o=[];
  if(+x.cash_payment_amount>0)o.push({method:"cash",amount:Number(x.cash_payment_amount)});
  if(+x.card_payment_amount>0)o.push({method:"card",amount:Number(x.card_payment_amount),reference:x.card_payment_reference||null});
  if(+x.qr_payment_amount>0)o.push({method:"qr",amount:Number(x.qr_payment_amount),reference:x.qr_payment_reference||null});
  return o;
};
