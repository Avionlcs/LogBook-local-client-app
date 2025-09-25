// src/api/sales/print/printReceipt.api.js
const db = require("../../../config/dbConfig");
const getSale = require("../helpers/getSaleWithRelations");
const { printEscposReceipt, printSystemReceipt } = require("./receiptPrinters");

module.exports = async (req, res) => {
  const pool = db.getPool();
  const { sale_public_id } = req.params;
  const { printer, copies = 1 } = req.body;

  try {
    const sale = await getSale(pool, sale_public_id);
    if (!sale) {
      return res.status(404).json({ success: false, error: "Sale not found" });
    }

    for (let i = 0; i < copies; i++) {
      if (printer.type === "escpos") {
        await printEscposReceipt(sale, printer);
      } else {
        await printSystemReceipt(sale, printer);
      }
    }

    res.json({ success: true, message: "Receipt sent to printer" });
  } catch (e) {
    console.error("Print error:", e);
    res.status(500).json({ success: false, error: "Print failed" });
  }
};
