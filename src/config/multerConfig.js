const multer = require("multer");
const path = require("path");
const fs = require("fs");

const isPkg = typeof process.pkg !== "undefined";
const basePath = isPkg ? path.dirname(process.execPath) : __dirname;
const uploadDir = path.join(basePath, "../data/uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 },
}).single("file");

const multiUpload = multer({
    storage,
    limits: { fileSize: 200 * 1024 * 1024 },
}).any();

const pdfUpload = multer({ storage }).single("pdfFile");

module.exports = { upload, multiUpload, pdfUpload };