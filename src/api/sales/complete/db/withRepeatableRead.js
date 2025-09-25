// Transaction helper: REPEATABLE READ
async function withRR(pool, fn) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    const r = await fn(c); await c.query("COMMIT"); return r;
  } catch (e) { try { await c.query("ROLLBACK"); } catch (_) { }; throw e; } finally { c.release(); }
}
module.exports = { withRR };
