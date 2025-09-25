
// Controller with standardized responses
const service = require("./completeSale.service");
const { sendOk, sendErr } = require("./utils/response");

module.exports = async function(req, res) {
  try {
    const result = await service.completeSale(req.body || {});
    sendOk(res, 200, {
      message: "Sale completed",
      sale: result.sale,
      change_due: result.change_due
    });
  } catch (error) {
    console.log(error, "KKKKKKKKKKKKKKKKKKK");
    
    sendErr(res, error.http || 500, error.public || "Server error");
  }
};
