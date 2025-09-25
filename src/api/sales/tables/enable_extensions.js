module.exports = {
  async create(pool) {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  }
};
