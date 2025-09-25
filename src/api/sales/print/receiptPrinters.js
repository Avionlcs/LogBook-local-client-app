// src/api/sales/print/receiptPrinters.js
const { printer: ThermalPrinter, types } = require("node-thermal-printer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

async function printEscposReceipt(sale, printer) {
  const p = new ThermalPrinter({
    type: types[printer.brand?.toUpperCase() || "EPSON"],
    interface: printer.interface, // e.g. "usb://", "tcp://192.168.0.50"
    width: 48, // characters per line (58mm ≈ 32, 80mm ≈ 48)
  });

  p.alignCenter();
  p.println("=== RECEIPT ===");
  p.drawLine();

  p.alignLeft();
  sale.items.forEach(it => {
    p.println(`${it.item_name} x${it.quantity}`);
    p.println(` @ ${it.unit_price} -> ${it.total_price}`);
  });

  p.drawLine();
  p.bold(true);
  p.println(`TOTAL: LKR ${sale.total_amount}`);
  p.bold(false);
  p.drawLine();

  sale.payments.forEach(pay => {
    p.println(`${pay.method.toUpperCase()}: ${pay.amount} (${pay.reference || ""})`);
  });

  p.cut();
  await p.execute();
}

async function printSystemReceipt(sale, printer) {
  const tmpFile = path.join(__dirname, "receipt.tmp.txt");
  const text = [
    "=== RECEIPT ===",
    `Sale ID: ${sale.public_id}`,
    "------------------",
    ...sale.items.map(it => `${it.item_name} x${it.quantity} ${it.total_price}`),
    "------------------",
    `TOTAL: LKR ${sale.total_amount}`,
    "------------------",
    ...sale.payments.map(p => `${p.method.toUpperCase()}: ${p.amount} (${p.reference || ""})`)
  ].join("\n");

  fs.writeFileSync(tmpFile, text);
  const cmd = printer.interface
    ? `lp -d ${printer.interface} ${tmpFile}`
    : `lp ${tmpFile}`;
  exec(cmd, err => { if (err) console.error("System print error:", err); });
}

module.exports = { printEscposReceipt, printSystemReceipt };
