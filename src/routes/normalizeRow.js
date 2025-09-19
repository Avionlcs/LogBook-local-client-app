const normalizeKey = require("./normalizeKey");

function normalizeRow(row) {

    const normalized = {};
    for (const key in row) {
        const newKey = normalizeKey(key);
        normalized[newKey] = row[key];
    }
        console.log(normalized, "LLLL");
    
    return normalized;
}

module.exports = normalizeRow;