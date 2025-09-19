// Replace with your real persistence. This is a stub using an in-memory Map.
const m = new Map();
exports.saveBulkStatus = async (id, payload) => { m.set(id, { ...(m.get(id)||{}), ...payload }); };
exports.getBulkStatus = async (id) => m.get(id) || null;
