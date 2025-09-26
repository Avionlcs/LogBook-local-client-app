// Controller with standardized responses
const service=require("./completeSale.service");
const {sendOk,sendErr}=require("./utils/response");
module.exports=async function(req,res){
  try{
    const r=await service.completeSale(req.body||{});
    sendOk(res,200,{message:"Sale completed",sale:r.sale,change_due:r.change_due});
  }catch(e){sendErr(res,e.http||500,e.public||"Server error");}
};
