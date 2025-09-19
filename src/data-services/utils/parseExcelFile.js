const XLSX = require("xlsx");
const { normalizeKey } = require("./normalizeKey");

exports.parseExcelFile = (filePath) => {
  const wb = XLSX.readFile(filePath);
  const sh = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sh, { header: 1 });
  if (!rows.length) return [];
  const headers = rows[0].map(h => normalizeKey(String(h)));
  return rows.slice(1).map(r => {
    const o = {}; headers.forEach((k, i) => o[k] = r[i]); return o;
  });
};
