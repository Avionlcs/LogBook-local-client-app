const XLSX = require("xlsx");
const normalizeKey = require("./normalizeKey/normalizeKey");

const parseExcelFile = (filePath) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Read sheet to array of arrays
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (rawData.length === 0) return [];

  const rawHeaders = rawData[0];

  // Use normalizeKey directly on headers
  const normalizedHeaders = rawHeaders.map((header) =>
    normalizeKey(String(header))
  );

  // Extract rows (skip header)
  const dataRows = rawData.slice(1);

  // Map to objects with normalized keys
  const jsonData = dataRows.map((row) => {
    const obj = {};
    normalizedHeaders.forEach((key, i) => {
      obj[key] = row[i];
    });
    return obj;
  });

  return jsonData;
};

module.exports = { parseExcelFile };
