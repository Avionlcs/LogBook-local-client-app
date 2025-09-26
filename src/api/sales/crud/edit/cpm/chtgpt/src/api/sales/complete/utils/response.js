// Standardized JSON responses
function sendOk(res,code,data){res.status(code).json({success:true,...data});}
function sendErr(res,code,message,details){res.status(code).json({success:false,error:message,details:details||null});}
module.exports={sendOk,sendErr};
