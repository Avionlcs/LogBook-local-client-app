const hashTable = require("./hash/hash.table");
const inventoryTable = require("./inventory/inventory.table");
const kv_storeTable = require("./kv_store.table");

const tables = [kv_storeTable, hashTable, inventoryTable];

module.exports = {
    async createAll(pool) {
        for (const table of tables) {
            if (typeof table.create === 'function') {
                await table.create(pool);
            }
        }
    }
};
