const express = require("express");
const initialSalesSummeryApi = require("./reportings/sales/initialSalesSummery.api");
const filterSalesSummeryApi = require("./reportings/sales/filterSalesSummery.api");
const { permissionMiddleware } = require("../middleware/authentication.middleware");
const router = express.Router();

router.get("/reportings/sales/initial-summery", permissionMiddleware("sales_reports"), initialSalesSummeryApi);
router.post("/reportings/sales/filter-summery", permissionMiddleware("sales_reports"), filterSalesSummeryApi);
module.exports = router;