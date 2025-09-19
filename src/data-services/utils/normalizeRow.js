const { normalizeKey } = require("./normalizeKey");
exports.normalizeRow = (row) => {
  const out = {}; for (const k in row) out[normalizeKey(k)] = row[k]; return out;
};
