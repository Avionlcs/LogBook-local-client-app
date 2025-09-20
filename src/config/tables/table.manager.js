const hashTable = require("./hash/hash.table");
const inventoryTable = require("../../api/inventory/tables/inventory.table");
const kv_storeTable = require("./kv_store.table");
const saleTable = require("../../api/sales/tables/sale.table");

const tables = [kv_storeTable, hashTable, inventoryTable, saleTable];

module.exports = {
    async createAll(pool) {
        for (const table of tables) {
            if (typeof table.create === 'function') {
                await table.create(pool);
            }
        }
    }
};
