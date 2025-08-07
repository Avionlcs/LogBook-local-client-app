const express = require("express");
const initialSalesSummeryApi = require("./reportings/sales/initialSalesSummery.api");
const filterSalesSummeryApi = require("./reportings/sales/filterSalesSummery.api");
const { permissionMiddleware } = require("../middleware/authentication.middleware");
const getAllSellersApi = require("./reportings/sales/getAllSellers.api");
const addInventoryItemApi = require("./inventory/add/addInventoryItem.api");
const hashSearchInventoryItemsApi = require("./inventory/search/hashSearchInventoryItems.api");
const router = express.Router();

router.get("/reportings/sales/initial-summery", permissionMiddleware("sales_reports"), initialSalesSummeryApi);
router.post("/reportings/sales/filter-summery", permissionMiddleware("sales_reports"), filterSalesSummeryApi);

router.get("/reportings/sales/get-all-sellars", permissionMiddleware("sales_reports"), getAllSellersApi);

router.post('/inventory/add', addInventoryItemApi);
router.get('/inventory/search', hashSearchInventoryItemsApi);


module.exports = router;