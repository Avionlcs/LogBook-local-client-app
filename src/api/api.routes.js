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
const { initiateSale } = require("./sales/crud/add/initiateSale.api");
const { addItemToSale } = require("./sales/crud/edit/addItemToSale.api");
const { removeItemFromSale } = require("./sales/crud/edit/removeItemFromSale.api");
const { cancelSale } = require("./sales/crud/delete/cancelSale.api");
const { pauseSale } = require("./sales/crud/edit/pauseSale.api");
const { resumeSale } = require("./sales/crud/edit/resumeSale.api");
const { paymentSale } = require("./sales/crud/edit/paymentSale.api");
const getSaleApi = require("./sales/crud/get/getSale.api");
const { getSaleByPublicId } = require("./sales/crud/get/getSaleByPublicId.api");
const { updateItemQuantityInSale } = require("./sales/crud/edit/updateItemQuantityInSale.api");
const { verifySale } = require("./sales/helpers/verifySale.api");
const completeSaleController = require("./sales/complete/completeSale.controller");

const router = express.Router();

router.get("/reportings/sales/initial-summery", permissionMiddleware("sales_reports"), initialSalesSummeryApi);
router.post("/reportings/sales/filter-summery", permissionMiddleware("sales_reports"), filterSalesSummeryApi);
router.get("/reportings/sales/get-all-sellars", permissionMiddleware("sales_reports"), getAllSellersApi);

// Inventory routes protected by both 'sales' and 'inventory' permissions
const inventoryPermissions = permissionMiddleware("sales,inventory");

router.post('/inventory/add', inventoryPermissions, addInventoryItemApi);
router.post('/inventory/add/bulk', inventoryPermissions, multiUpload, addBulkInventoryItemsApi);
router.get('/inventory/add/bulk/status/:processId', inventoryPermissions, getProcessStatusApi);
router.get('/inventory/search', inventoryPermissions, hashSearchInventoryItemsApi);
router.get('/inventory/get/initial-inventory', inventoryPermissions, getInitialInventoryDataApi);
router.get('/inventory/get/most-sold', inventoryPermissions, mostSoldItemsApi);

// Sales routes protected by 'sales' permission only
const salesPermissions = permissionMiddleware("sales");

router.get("/sales/verify/:saleId", verifySale);
router.post("/sales/initiate", salesPermissions, initiateSale);
router.post("/sales/item/add", salesPermissions, addItemToSale);
router.post("/sales/item/update-quantity", salesPermissions, updateItemQuantityInSale);
router.delete("/sales/item/remove", salesPermissions, removeItemFromSale);
router.post("/sales/cancel", salesPermissions, cancelSale);
router.post("/sales/pause", salesPermissions, pauseSale);
router.post("/sales/resume", salesPermissions, resumeSale);
router.post("/sales/payment", salesPermissions, paymentSale);
router.get("/sales", salesPermissions, getSaleApi);
router.post("/sales/complete", salesPermissions, completeSaleController);
router.get("/sales/:sale_public_id", salesPermissions, getSaleByPublicId);


module.exports = router;
