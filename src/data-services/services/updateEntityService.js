const { hash } = require("bcrypt");
const db = require("../config/dbConfig");
const { makeHash } = require("../utils/dbUtils");

module.exports = async (entity, id, body) => {
  const key = `${entity}:${id}`;
  const buf = await db.get(key);
  const existing = buf ? JSON.parse(buf.toString("utf-8")) : null;
  if (!existing) throw new Error("Item not found");

  const updated = { ...body, last_updated: new Date().toISOString() };
  if (updated.password) updated.password = await hash(updated.password + "ems&sort_by=sold&limit=20", 10);

  await db.put(key, JSON.stringify(updated));

  const changed = [];
  for (const [k, v] of Object.entries(updated)) {
    const ov = existing[k];
    if (ov && ov !== v) changed.push(k);
  }
  for (const k of changed) await makeHash(updated[k], k, entity, id);

  return { message: `Item updated successfully in ${entity}`, updatedItem: updated };
};
