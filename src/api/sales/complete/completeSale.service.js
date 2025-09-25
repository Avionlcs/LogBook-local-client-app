// Orchestrator: validate → idempotency → tx → finalize
const db = require("../../../config/dbConfig"), { withRR } = require("./db/withRepeatableRead");
const { validateRequest } = require("./validators/request.validator");
const lock = require("./repos/lockSale.repo"), items = require("./repos/getItems.repo");
const totals = require("./repos/computeTotals.repo"), sumReq = require("./repos/sumRequestPayments.repo");
const apply = require("./repos/applyPayments.repo"), finalize = require("./repos/finalizeSale.repo");
const listPays = require("./repos/listPayments.repo"), idem = require("./repos/idempotency.repo");
const { round2 } = require("./utils/money");
function boom(http, msg) { const e = new Error(msg); e.http = http; e.public = msg; return e; }

module.exports.completeSale = async (body) => {
  const v = validateRequest(body); if (!v.valid) throw boom(400, v.error);
  // default currency to LKR without persisting it
  for (const p of body.payments) { if (!p.currency) p.currency = "LKR"; }
  if (body.idempotency_key) { const c = await idem.find(body.sale_public_id, body.idempotency_key); if (c) return c; }
  const pool = db.getPool();
  const out = await withRR(pool, async c => {
    const s = await lock(c, body.sale_public_id); if (!s) throw boom(404, "Sale not found");
    if (s.status !== "processing") throw boom(409, "Wrong sale state");
    const t = await totals(c, body.sale_public_id);
    const reqSum = Number(await sumReq(c, body.payments));
    if (reqSum < Number(t.total_amount)) throw boom(400, "Insufficient payment");
    await apply(c, body.sale_public_id, body.payments);
    const row = await finalize(c, body.sale_public_id, t.total_amount, reqSum, body.payments);
    const it = await items(c, body.sale_public_id); const pays = await listPays(c, body.sale_public_id);
    return { sale: { ...row, items: it, payments: pays }, change_due: round2(reqSum - Number(t.total_amount)) };
  });
  if (body.idempotency_key) await idem.save(body.sale_public_id, body.idempotency_key, out);
  return out;
};
