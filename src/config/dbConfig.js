const { Readable } = require('stream');
const { Pool } = require('pg');

const SUPER_USER_CONFIG = {
    user: process.env.PG_SUPERUSER || 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: process.env.PG_SUPERUSER_PASSWORD || 'd241150$0114!4dde@a46d&a74641da4f17',
    port: parseInt(process.env.PG_PORT) || 5638
};

const APP_USER = process.env.PG_APP_USER || 'appuser';
const APP_PASSWORD = process.env.PG_APP_PASSWORD || 'apppass';
const APP_DB = 'appdb';

let pool;

async function bootstrapDatabase() {
    const superPool = new Pool(SUPER_USER_CONFIG);
    let client;
    try {
        client = await superPool.connect();
        console.log('[PostgreSQL] Connected to superuser ✅');
        const roleCheck = await client.query(`SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1`, [APP_USER]);
        if (roleCheck.rowCount === 0) {

            await client.query(`CREATE ROLE ${quoteIdent(APP_USER)} LOGIN PASSWORD ${quoteLiteral(APP_PASSWORD)}`);
            console.log(`[PostgreSQL] Role '${APP_USER}' created`);
        } else {
            console.log(`[PostgreSQL] Role '${APP_USER}' already exists`);
        }

        const dbCheck = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [APP_DB]);
        if (dbCheck.rowCount === 0) {
            await client.query(`CREATE DATABASE ${quoteIdent(APP_DB)} OWNER ${quoteIdent(APP_USER)}`);
            console.log(`[PostgreSQL] Database '${APP_DB}' created`);
        } else {
            console.log(`[PostgreSQL] Database '${APP_DB}' already exists`);
        }
    } catch (err) {
        console.error('Error during PostgreSQL bootstrap:', err);
        console.error('[PostgreSQL] Bootstrap error ❌', err.message);
        throw err;
    } finally {
        if (client) client.release();
        await superPool.end();
    }
}

async function initAppDB() {
    pool = new Pool({
        user: APP_USER,
        host: 'localhost',
        database: APP_DB,
        password: APP_PASSWORD,
        port: 5638
    });

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT
            );
        `);
        console.log('[PostgreSQL] Table "kv_store" ready ✅');
    } catch (err) {
        console.error('[PostgreSQL] Table init error ❌', err.message);
        throw err;
    }
}

function quoteIdent(str) {
    return `"${str.replace(/"/g, '""')}"`;
}

// Helper function to quote literals safely
function quoteLiteral(str) {
    return `'${str.replace(/'/g, "''")}'`;
}

// Init everything at startup
(async () => {
    try {
        await bootstrapDatabase();
        await initAppDB();
        console.log('[PostgreSQL] Initialization complete ✅');
    } catch (err) {
        console.error('Error during PostgreSQL startup:', err);
        console.error('[PostgreSQL] Startup failed ❌', err.message);
        process.exit(1);
    }
})();

const db = {};

db.get = async (key) => {
    // console.log(1);
    try {
        const res = await pool.query('SELECT value FROM kv_store WHERE key = $1', [key]);
        // // console.log(res.rows[0], 'Row fetched');
        if (res.rows[0] == undefined) {
            // console.log('No value found for key:', key);
            return null;
        }
        return res.rows[0]?.value ?? null;
    } catch {
        return null;
    }
};

db.getMany = async (keys) => {
    // console.log(2);

    try {
        if (!keys.length) return [];
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(',');
        const res = await pool.query(`SELECT key, value FROM kv_store WHERE key IN (${placeholders})`, keys);
        return res.rows;
    } catch {
        return [];
    }
};

db.createValueStream = async () => {
    // console.log(3);
    try {
        const res = await pool.query('SELECT value FROM kv_store');
        const stream = new Readable({ objectMode: true, read() { } });
        res.rows.forEach(row => stream.push(row.value));
        stream.push(null);
        return stream;
    } catch {
        const stream = new Readable({ objectMode: true, read() { } });
        stream.push(null);
        return stream;
    }
};

db.createReadStream = async () => {
    // console.log(4);
    try {
        const res = await pool.query('SELECT * FROM kv_store');
        return res.rows;
    } catch {
        return [];
    }
};

db.createKeyStream = async () => {
    // console.log(5);
    try {
        const res = await pool.query('SELECT key FROM kv_store');
        const stream = new Readable({ objectMode: true, read() { } });
        res.rows.forEach(row => stream.push(row.key));
        stream.push(null);
        return stream;
    } catch {
        const stream = new Readable({ objectMode: true, read() { } });
        stream.push(null);
        return stream;
    }
};

db.del = async (key) => {
    // console.log(6);
    try {
        await pool.query('DELETE FROM kv_store WHERE key = $1', [key]);
    } catch {
        // ignore
    }
};

db.put = async (key, value) => {
    // console.log(7);
    try {
        await pool.query(`
            INSERT INTO kv_store (key, value)
            VALUES ($1, $2)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [key, value]);
    } catch {
        // ignore
    }
};

db.close = async () => {
    // console.log(8);
    try {
        await pool.end();
        // console.log('[PostgreSQL] Connection pool closed ✅');
    } catch (err) {
        console.error('[PostgreSQL] Error closing pool ❌', err.message);
    }
};

module.exports = db;