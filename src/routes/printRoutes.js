const express = require("express");
const router = express.Router();
const { getPrinters, getCleanPrinterNames } = require("../utils/printerUtils");
const { generateAndPrintPDF, printPDF } = require("../utils/pdfUtils");
const { pdfUpload } = require("../config/multerConfig");

router.get("/printers", async (req, res) => {
    try {
        const printers = await getPrinters();
        const printerNames = getCleanPrinterNames(printers);
        res.json(printerNames);
    } catch (error) {
        console.error("Error retrieving printers:", error);
        res.status(500).send("Error retrieving printers");
    }
});

router.post("/print-html", async (req, res) => {
    const { printerName, htmlContent, refCode } = req.body;
    if (!htmlContent) return res.status(400).send("HTML content is required");
    try {
        const pdfFilePath = await generateAndPrintPDF(printerName, htmlContent, refCode);
        res.sendFile(pdfFilePath);
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        res.status(500).send(`Failed to generate PDF: ${error.message}`);
    }
});

router.post("/print", pdfUpload, async (req, res) => {
    const { printerName, pdfFileName } = req.body;
    if (!pdfFileName) return res.status(400).send("PDF file is required");
    try {
        await printPDF(printerName, pdfFileName);
        res.send("Printing successful");
    } catch (error) {
        console.error("Printing failed:", error);
        res.status(500).send("Printing failed");
    }
});

module.exports = router;