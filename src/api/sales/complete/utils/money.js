// Money: 2dp positive, rounding
function isValidMoney(x){const s=String(x??"");return/^\d+(?:\.\d{1,2})?$/.test(s)&&Number(s)>0;}
function round2(n){return Math.round((Number(n)+Number.EPSILON)*100)/100;}
module.exports={isValidMoney,round2};
