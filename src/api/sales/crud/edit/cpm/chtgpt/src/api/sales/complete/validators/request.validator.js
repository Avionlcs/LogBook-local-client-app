// Validate sale and payments
const {isValidMoney}=require("../utils/money");
const ALLOWED=new Set(["cash","card","qr"]);
module.exports.validateRequest=b=>{
  if(!b||typeof b!=="object")return{valid:false,error:"body required"};
  if(!b.sale_public_id||typeof b.sale_public_id!=="string")return{valid:false,error:"sale_public_id required"};
  const a=b.payments;if(!Array.isArray(a)||a.length===0)return{valid:false,error:"payments required"};
  if(a.length>10)return{valid:false,error:"max 10 payments"};
  for(const p of a){
    if(!p||!ALLOWED.has(p.method))return{valid:false,error:"invalid method"};
    if(p.currency&&p.currency!=="LKR")return{valid:false,error:"currency must be LKR"};
    if(p.reference&&(typeof p.reference!=="string"||p.reference.length>128))return{valid:false,error:"bad reference"};
    if(!isValidMoney(p.amount))return{valid:false,error:"invalid amount"};
  }
  if(b.idempotency_key&&typeof b.idempotency_key!=="string")return{valid:false,error:"bad idempotency_key"};
  return{valid:true};
};
