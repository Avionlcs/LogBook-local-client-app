module.exports = {
    async create(pool) {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS entity_counters (
        entity TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );
    `);
    }
};
