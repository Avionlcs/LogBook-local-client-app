const puppeteer = require("puppeteer");
const path = require("path");
const { print } = require("pdf-to-printer");
const { unlinkSync } = require("fs");
const { getChromePath } = require("./printerUtils");

const generateAndPrintPDF = async (printerName, htmlContent, refCode) => {
    const browserPath = getChromePath();
    if (!browserPath) throw new Error("Default browser not found on server.");
    const browser = await puppeteer.launch({
        executablePath: browserPath,
        headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const height = await page.evaluate((refCode) => {
        const element = document.querySelector(`.receipt-${refCode}-container`);
        return element ? element.scrollHeight + 20 : 0;
    }, refCode);
    const pdfOptions = {
        width: "80mm",
        height: `${height}px`,
        printBackground: true,
    };
    const pdfFilePath = path.join(__dirname, "../Uploads", `generated_${refCode}.pdf`);
    await page.pdf({ path: pdfFilePath, ...pdfOptions });
    await browser.close();
    const options = {
        printer: printerName,
        orientation: "portrait",
        monochrome: false,
        side: "duplexlong",
        paperSize: "80mm",
        silent: true,
        copies: 1,
    };
    await print(pdfFilePath, options);
    return pdfFilePath;
};

const printPDF = async (printerName, pdfFileName) => {
    const pdfFilePath = path.join(__dirname, "../Uploads", pdfFileName);
    const options = {
        printer: printerName,
        orientation: "portrait",
        scale: "fit",
        monochrome: false,
        side: "duplexlong",
        paperSize: "80mm",
        silent: true,
        copies: 1,
    };
    await print(pdfFilePath, options);
    unlinkSync(pdfFilePath);
};

module.exports = { generateAndPrintPDF, printPDF };