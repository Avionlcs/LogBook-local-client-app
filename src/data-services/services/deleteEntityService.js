const CryptoJS = require("crypto-js");
const db = require("../config/dbConfig");

async function removeHashes(entity, item) {
  for (const [field, value] of Object.entries(item)) {
    const words = value.toString().toLowerCase().split(" ");
    for (const w of words) {
      const h = CryptoJS.SHA256(w.replace(/[,.]/g, "")).toString();
      const hs = await db.get("HashData:" + h).then(b => JSON.parse(b.toString("utf-8"))).catch(() => null);
      if (!hs) continue;
      hs[value] = hs[value] || {}; hs[value][entity] = hs[value][entity] || {};
      hs[value][entity][field] = (hs[value][entity][field] || []).filter(x => x !== item.id);
      await db.put("HashData:" + h, JSON.stringify(hs));
    }
  }
}

module.exports = async (entity, id) => {
  const key = `${entity}:${id}`;
  const buf = await db.get(key).catch(() => null);
  const item = buf ? JSON.parse(buf.toString("utf-8")) : null;
  if (!item) return { success: false, message: "Item not found" };
  await removeHashes(entity, item);
  await db.del(key);
  return { success: true, message: `Item deleted successfully from ${entity}` };
};
