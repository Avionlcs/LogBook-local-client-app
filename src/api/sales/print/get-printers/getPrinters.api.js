// src/api/sales/print/getPrinters.api.js
let printerLib;
try {
  printerLib = require("printer"); // external module
} catch (err) {
  console.warn("⚠️ printer module not installed, system printer listing unavailable");
}

module.exports = async (req, res) => {
  try {
    if (!printerLib) {
      return res.status(500).json({
        success: false,
        error: "Printer module not installed",
      });
    }

    const printers = printerLib.getPrinters().map(p => p.name);

    res.json({
      success: true,
      printers,
    });
  } catch (err) {
    console.error("Get printers error:", err);
    res.status(500).json({ success: false, error: "Unable to fetch printers" });
  }
};
