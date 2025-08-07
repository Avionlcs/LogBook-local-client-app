const { Readable } = require('stream');
const { Pool } = require('pg');
const { log } = require('console');

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
        //console.log('[PostgreSQL] Connected to superuser ✅');
        const roleCheck = await client.query(`SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = $1`, [APP_USER]);
        if (roleCheck.rowCount === 0) {

            await client.query(`CREATE ROLE ${quoteIdent(APP_USER)} LOGIN PASSWORD ${quoteLiteral(APP_PASSWORD)}`);
            // console.log(`[PostgreSQL] Role '${APP_USER}' created`);
        } else {
            // console.log(`[PostgreSQL] Role '${APP_USER}' already exists`);
        }

        const dbCheck = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [APP_DB]);
        if (dbCheck.rowCount === 0) {
            await client.query(`CREATE DATABASE ${quoteIdent(APP_DB)} OWNER ${quoteIdent(APP_USER)}`);
            // console.log(`[PostgreSQL] Database '${APP_DB}' created`);
        } else {
            // console.log(`[PostgreSQL] Database '${APP_DB}' already exists`);
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
        port: parseInt(process.env.PG_PORT) || 5638
    });

    try {
        await tableManager.createAll(pool);
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
        // console.log('[PostgreSQL] Initialization complete ✅');
    } catch (err) {
        console.error('Error during PostgreSQL startup:', err);
        console.error('[PostgreSQL] Startup failed ❌', err.message);
        process.exit(1);
    }
})();

const db = {};

db.get = async (key) => {
    //// console.log(1);
    try {
        const res = await pool.query('SELECT value FROM kv_store WHERE key = $1', [key]);
        // //// console.log(res.rows[0], 'Row fetched');
        if (res.rows[0] == undefined) {
            //// console.log('No value found for key:', key);
            return null;
        }
        return res.rows[0]?.value ?? null;
    } catch {
        return null;
    }
};

db.getMany = async (keys) => {

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
    //// console.log(4);
    try {
        const res = await pool.query('SELECT * FROM kv_store');
        return res.rows;
    } catch {
        return [];
    }
};

db.createKeyStream = async () => {
    //// console.log(5);
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
    //// console.log(6);
    try {
        await pool.query('DELETE FROM kv_store WHERE key = $1', [key]);
    } catch {
        // ignore
    }
};

db.put = async (key, value) => {
    //// console.log(7);
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
    //// console.log(8);
    try {
        await pool.end();
        //// console.log('[PostgreSQL] Connection pool closed ✅');
    } catch (err) {
        console.error('[PostgreSQL] Error closing pool ❌', err.message);
    }
};

db.getItemsCount = async (schema) => {
    const res = await pool.query(
        `SELECT COUNT(*) FROM kv_store 
         WHERE key LIKE $1 AND key NOT LIKE $2`,
        [`${schema}:%`, `${schema}:phone:%`]
    );
    return parseInt(res.rows[0].count, 10);
};

db.searchByEntityKeyValue = async (entity, key, value) => {
    try {
        const query = `
            SELECT value 
            FROM kv_store
            WHERE key LIKE $1
              AND (value::json ->> $2) = $3
        `;
        const params = [`${entity}:%`, key, value];
        const res = await pool.query(query, params);

        return res.rows.map(row => JSON.parse(row.value));
    } catch (error) {
        console.error("Error searching by entity/key/value:", error);
        return [];
    }
};

db.getEntities = async (entity, startISO, endISO) => {
    log(`Fetching entities for ${entity} from ${startISO} to ${endISO}`);
    try {
        // Fetch all keys for entity (no limit)
        const query = `
            SELECT key, value
            FROM kv_store
            WHERE key LIKE $1
            ORDER BY key
        `;
        const params = [`${entity}:%`];
        const res = await pool.query(query, params);

        // Parse and filter by date range in memory
        const filtered = res.rows.filter(row => {
            try {
                const obj = JSON.parse(row.value);
                const created = obj.created || obj.last_updated;
                if (!created) return false;
                return created >= startISO && created <= endISO;
            } catch {
                return false;
            }
        });

        return filtered.map(row => ({
            id: row.key.split(':')[1],
            ...JSON.parse(row.value),
        }));

    } catch (error) {
        console.error("Error fetching entities:", error);
        return [];
    }
};

const Cursor = require('pg-cursor');
const tableManager = require('./tables/table.manager');

db.getEntitiesRange = async (entity, start, end) => {
    const client = await pool.connect();
    start = start ? parseInt(start, 10) : 0;
    end = end ? parseInt(end, 10) : undefined;

    try {
        let limitClause = '';
        let params = [`${entity}:%`, start];

        if (typeof end === 'number' && !isNaN(end)) {
            const limit = end - start;
            if (limit <= 0) {
                return [];
            }
            limitClause = `LIMIT $3`;
            params.push(limit);
        }

        const query = `
      SELECT key, value
      FROM kv_store
      WHERE key LIKE $1
      ORDER BY CAST((value::jsonb)->>'created' AS TIMESTAMP) DESC NULLS LAST,
               CAST((value::jsonb)->>'last_updated' AS TIMESTAMP) DESC NULLS LAST
      OFFSET $2
      ${limitClause}
    `;

        const cursor = client.query(new Cursor(query, params));

        const rows = [];
        const batchSize = 1000;
        let batch;

        do {
            batch = await new Promise((resolve, reject) => {
                cursor.read(batchSize, (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });

            for (const row of batch) {
                try {
                    const value = JSON.parse(row.value);
                    rows.push({ id: row.key.split(':')[1], ...value });
                } catch {
                    continue;
                }
            }
        } while (batch.length === batchSize && (params.length < 3 || rows.length < params[2]));

        cursor.close(() => { });
        return rows;
    } catch (error) {
        console.error("Error fetching entities:", error);
        return [];
    } finally {
        client.release();
    }
};

db.getEntitiesSorted = async (entity, sortBy = 'sold', limit = 20) => {
    try {
        const query = `
SELECT key, value
FROM kv_store
WHERE key LIKE $1
  AND (length(key) - length(replace(key, ':', ''))) = 1
ORDER BY
  CASE
    -- If value is numeric
    WHEN (value::jsonb)->>$2 ~ '^[0-9]+(\\\\.[0-9]+)?$'
      THEN ((value::jsonb)->>$2)::NUMERIC

    -- Else try to treat it as timestamp (ISO or similar) and convert to ms
    WHEN (value::jsonb)->>$2 ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}.*$'
      THEN COALESCE(EXTRACT(EPOCH FROM ((value::jsonb)->>$2)::timestamptz) * 1000, 0)

    -- Fallback for invalid values
    ELSE 0
  END DESC
LIMIT $3
        `;
        const params = [`${entity}:%`, sortBy, limit];

        const res = await pool.query(query, params);

        return res.rows.map(row => {
            try {
                const obj = JSON.parse(row.value);
                return { id: row.key.split(':')[1], ...obj };
            } catch {
                return null; // Skip malformed JSON
            }
        }).filter(Boolean);
    } catch (error) {
        console.error("Error fetching sorted entities:", error);
        return [];
    }
};

db.getUsersByPermission = async (permission) => {
    try {
        // 1. Get all users (keys starting with "user:")
        const userRows = await pool.query(
            `SELECT key, value FROM kv_store WHERE key LIKE 'user:%' AND key NOT LIKE 'user:phone:%'`
        );

        const users = userRows.rows.map(row => {
            try {
                return { id: row.key.split(':')[1], ...JSON.parse(row.value) };
            } catch {
                return null;
            }
        }).filter(Boolean);

        if (!users.length) return [];

        // 2. Collect all role IDs from users
        const roleIds = new Set();
        users.forEach(user => {
            if (Array.isArray(user.roles)) {
                user.roles.forEach(role => roleIds.add(role.id));
            }
        });

        if (!roleIds.size) return [];

        // 3. Fetch roles data for these IDs
        const rolePlaceholders = [...roleIds].map((_, i) => `$${i + 1}`).join(',');
        const roleQuery = `SELECT key, value FROM kv_store WHERE key IN (${[...roleIds].map(id => `'roles:${id}'`).join(',')})`;
        const roleRes = await pool.query(roleQuery);

        const roleMap = new Map();
        roleRes.rows.forEach(row => {
            try {
                const role = JSON.parse(row.value);
                roleMap.set(role.id, role.permissions || []);
            } catch { }
        });

        // 4. Filter users who have the required permission
        const filteredUsers = users.filter(user => {
            if (!Array.isArray(user.roles)) return false;

            return user.roles.some(role => {
                const perms = roleMap.get(role.id) || [];
                return perms.includes(permission);
            });
        });

        return filteredUsers;
    } catch (error) {
        console.error("Error fetching users by permission:", error);
        return [];
    }
};
db.getPool = () => {
    return pool;
}
module.exports = db;