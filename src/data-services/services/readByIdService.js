const db = require("../config/dbConfig");

module.exports = async (entity, id) => {
  const key = `${entity}:${id}`;
  const buf = await db.get(key).catch(() => null);
  return buf ? JSON.parse(buf) : null;
};
