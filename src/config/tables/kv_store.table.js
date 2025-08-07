module.exports = {
    async create(pool) {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);
    }
};