const enableExtensions = require("./enable_extensions");
const createToBase36 = require("./create_to_base36_function");
const createSales = require("./create_sales_table");
const createSaleItems = require("./create_sale_items_table");
const createSaleOffers = require("./create_sale_offers_table");
const createSalePayments = require("./create_sale_payments_table");
const createIndexes = require("./create_sales_indexes");

module.exports = {
  async create(pool) {
    await enableExtensions.create(pool);
    await createToBase36.create(pool);
    await createSales.create(pool);
    await createSaleItems.create(pool);
    await createSaleOffers.create(pool);
    await createSalePayments.create(pool);
    await createIndexes.create(pool);
  }
};
