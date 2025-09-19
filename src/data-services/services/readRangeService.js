const db = require("../config/dbConfig");

module.exports = async (entity, start = 0, end = 50) => {
  const rows = await db.createReadStream();
  const out = []; let idx = 0;
  for (const row of rows) {
    const [e] = row.key.split(":");
    if (e === entity) {
      if (idx >= start && idx < end) {
        try { out.push(JSON.parse(row.value)); } catch {}
      }
      idx++;
    }
  }
  return out;
};
