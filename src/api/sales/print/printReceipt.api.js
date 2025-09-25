// src/api/sales/print/printReceipt.api.js
const db = require("../../../config/dbConfig");
const getSale = require("../helpers/getSaleWithRelations");
const { printEscposReceipt, printSystemReceipt } = require("./receiptPrinters");
const { renderReceiptToImage } = require("./receiptImage");

module.exports = async (req, res) => {
  const pool = db.getPool();
  const { sale_public_id } = req.params;
  const { printer, copies = 1 } = req.body;

  try {
    const sale = await getSale(pool, sale_public_id);
    if (!sale) {
      return res.status(404).json({ success: false, error: "Sale not found" });
    }

    let printError = null;

    // Attempt printing, but catch errors
    for (let i = 0; i < copies; i++) {
      try {
        if (printer?.type === "escpos") {
          await printEscposReceipt(sale, printer);
        } else if (printer) {
          await printSystemReceipt(sale, printer);
        }
      } catch (err) {
        console.error("Printer error:", err);
        printError = err.message || "Printer error";
      }
    }

    // Always render + save an image, regardless of printing success
    const imgPath = await renderReceiptToImage(sale);

    return res.json({
      success: true,
      message: printError ? "Receipt saved, print failed" : "Receipt printed and saved",
      imagePath: imgPath,
      printError: printError || null
    });
  } catch (e) {
    console.error("Receipt generation error:", e);
    res.status(500).json({ success: false, error: "Receipt generation failed" });
  }
};
