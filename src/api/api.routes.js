const express = require("express");
const initialSalesSummeryApi = require("./reportings/sales/initialSalesSummery.api");
const filterSalesSummeryApi = require("./reportings/sales/filterSalesSummery.api");
const { permissionMiddleware } = require("../middleware/authentication.middleware");
const getAllSellersApi = require("./reportings/sales/getAllSellers.api");
const addInventoryItemApi = require("./inventory/add/addInventoryItem.helper");
const { multiUpload } = require("../config/multerConfig");
const addBulkInventoryItemsApi = require("./inventory/add/bulk/addBulkInventoryItems.api");
const hashSearchInventoryItemsApi = require("./inventory/get/hashSearchInventoryItems.api");
const getProcessStatusApi = require("./inventory/add/bulk/getProcessStatus.api");
const router = express.Router();

router.get("/reportings/sales/initial-summery", permissionMiddleware("sales_reports"), initialSalesSummeryApi);
router.post("/reportings/sales/filter-summery", permissionMiddleware("sales_reports"), filterSalesSummeryApi);

router.get("/reportings/sales/get-all-sellars", permissionMiddleware("sales_reports"), getAllSellersApi);

router.post('/inventory/add', addInventoryItemApi);
router.get('/inventory/search', hashSearchInventoryItemsApi);

router.post('/inventory/add/bulk', multiUpload, addBulkInventoryItemsApi);

router.get('/inventory/add/bulk/status/:processId', getProcessStatusApi);

module.exports = router;