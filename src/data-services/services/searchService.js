const { HashSearch } = require("../utils/dbUtils");
module.exports = async (keyword, schema, filterBy, limit) =>
  HashSearch(keyword, schema, filterBy, limit);
