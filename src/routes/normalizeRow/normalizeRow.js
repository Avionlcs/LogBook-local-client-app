const normalizeKey = require("./normalizeKey/normalizeKey");

function normalizeRow(row) {

    const normalized = {};
    for (const key in row) { 
        const newKey = normalizeKey(key);
        normalized[newKey] = row[key];
    }
    return normalized;
}

module.exports = normalizeRow;