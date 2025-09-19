const { addData } = require("../utils/dbUtils");
module.exports = async (entity, body) => addData(entity, body, true);
