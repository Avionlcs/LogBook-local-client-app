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
const getInitialInventoryDataApi = require("./inventory/get/getInitialInventoryData.api");
const mostSoldItemsApi = require("./inventory/get/mostSoldItems.api");

// New sales endpoints
const { initiateSale } = require("./sales/initiateSale.api");
const { addItemToSale } = require("./sales/addItemToSale.api");
const { removeItemFromSale } = require("./sales/removeItemFromSale.api");
const { cancelSale } = require("./sales/cancelSale.api");

const router = express.Router();

router.get("/reportings/sales/initial-summery", permissionMiddleware("sales_reports"), initialSalesSummeryApi);
router.post("/reportings/sales/filter-summery", permissionMiddleware("sales_reports"), filterSalesSummeryApi);
router.get("/reportings/sales/get-all-sellars", permissionMiddleware("sales_reports"), getAllSellersApi);

router.post('/inventory/add', addInventoryItemApi);
router.post('/inventory/add/bulk', multiUpload, addBulkInventoryItemsApi);
router.get('/inventory/add/bulk/status/:processId', getProcessStatusApi);
router.get('/inventory/search', hashSearchInventoryItemsApi);
router.get('/inventory/get/initial-inventory', getInitialInventoryDataApi);
router.get('/inventory/get/most-sold', mostSoldItemsApi);

// Sales routes with permission middleware
router.post("/sales/initiate", permissionMiddleware("sales"), initiateSale);
router.post("/sales/item/add", permissionMiddleware("sales"), addItemToSale);
router.delete("/sales/item/remove", permissionMiddleware("sales"), removeItemFromSale);
router.post("/sales/cancel", permissionMiddleware("sales"), cancelSale);

module.exports = router;
