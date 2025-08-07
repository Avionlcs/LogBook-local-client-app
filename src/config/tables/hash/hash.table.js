module.exports = {
    async create(pool) {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS hash_table (
        hash TEXT PRIMARY KEY,
        substring TEXT NOT NULL,
        schema_name TEXT NOT NULL,
        element_key TEXT NOT NULL
      );
    `);

        await pool.query(`
      CREATE TABLE IF NOT EXISTS hash_reference_ids (
        hash TEXT NOT NULL REFERENCES hash_table(hash) ON DELETE CASCADE,
        reference_id TEXT NOT NULL,
        PRIMARY KEY (hash, reference_id)
      );
    `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_element_key ON hash_table(element_key);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_substring ON hash_table(substring);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_schema_name ON hash_table(schema_name);`);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_reference_id ON hash_reference_ids(reference_id);`);
    }
};
