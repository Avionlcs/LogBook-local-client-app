const db = require("../config/dbConfig");

module.exports = async (entity, key, value) => {
  const results = [];
  await db.createReadStream()
    .on("data", d => {
      const [e] = d.key.split(":");
      if (e !== entity) return;
      try {
        const item = JSON.parse(d.value);
        if (item[key] === value) results.push(item);
      } catch {}
    });
  return results;
};
