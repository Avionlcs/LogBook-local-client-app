const express = require("express");
const router = express.Router();

const addEntityController = require("./controllers/addEntityController");
const addBulkController = require("./controllers/addBulkController");
const bulkStatusController = require("./controllers/bulkStatusController");
const searchController = require("./controllers/searchController");
const readRangeController = require("./controllers/readRangeController");
const readByIdController = require("./controllers/readByIdController");
const readByKeyValueController = require("./controllers/readByKeyValueController");
const updateEntityController = require("./controllers/updateEntityController");
const deleteEntityController = require("./controllers/deleteEntityController");

const { multiUpload } = require("./config/multerConfig");

router.post("/add/:entity", addEntityController);
router.post("/add/bulk/:entity", multiUpload, addBulkController);
router.get("/bulk/status/:processId", bulkStatusController);

router.get("/search", searchController);
router.get("/read/:entity/:start/:end", readRangeController);
router.get("/read/:entity/:id", readByIdController);
router.get("/read_key_value/:entity/search/:key/:value", readByKeyValueController);

router.put("/update/:entity/:id", updateEntityController);
router.delete("/delete/:entity/:id", deleteEntityController);

module.exports = router;
