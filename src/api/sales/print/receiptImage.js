// src/api/sales/print/receiptImage.js
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

async function renderReceiptToImage(sale) {
    const html = renderReceiptHtml(sale);
    const outDir = path.join(__dirname, "../../../receipts");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const filePath = path.join(outDir, `${sale.public_id}.png`);

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.screenshot({ path: filePath, fullPage: true });
    await browser.close();

    return filePath;
}

function renderReceiptHtml(sale) {
    const items = sale.items.map(
        it => `<tr><td>${it.item_name}</td><td>${it.quantity}</td><td>${it.unit_price}</td><td>${it.total_price}</td></tr>`
    ).join("");

    const payments = sale.payments.map(
        p => `<tr><td>${p.method}</td><td>${p.amount}</td><td>${p.currency}</td><td>${p.reference || ""}</td></tr>`
    ).join("");

    return `
  <html>
  <head>
    <style>
      body { font-family: monospace; width: 280px; margin: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      td, th { border: 1px solid #ccc; padding: 4px; text-align: left; }
      h2 { text-align: center; }
    </style>
  </head>
  <body>
    <h2>Receipt ${sale.public_id}</h2>
    <p>Status: ${sale.status}</p>
    <p>Total: LKR ${sale.total_amount}</p>
    <h3>Items</h3>
    <table><tr><th>Name</th><th>Qty</th><th>Unit</th><th>Total</th></tr>${items}</table>
    <h3>Payments</h3>
    <table><tr><th>Method</th><th>Amount</th><th>Currency</th><th>Ref</th></tr>${payments}</table>
  </body>
  </html>`;
}

module.exports = { renderReceiptToImage };
