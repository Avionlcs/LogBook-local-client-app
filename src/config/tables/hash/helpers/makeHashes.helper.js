const db = require("../../../dbConfig");

const addSubstringToHashTable = async (client, hash, elementKey, referenceId, schemaName) => {
    await client.query(
        `
    INSERT INTO hash_table (hash, substring, schema_name, element_key)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT DO NOTHING
    `,
        [hash, hash, schemaName, elementKey]
    );

    await client.query(
        `
    INSERT INTO hash_reference_ids (hash, reference_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
    `,
        [hash, referenceId]
    );
};

const addHashVariations = async (client, substring, elementKey, referenceId, schemaName) => {
    const variants = [
        substring,
        `${substring}+&-${elementKey}`,
        `${substring}+&+${schemaName}`,
        `${substring}+&+${schemaName}-*&${substring}+&-${elementKey}`
    ];

    for (const hash of variants) {
        await addSubstringToHashTable(client, hash, elementKey, referenceId, schemaName);
    }
};

const generateSubstrings = (word) => {
    if (!word) return [];
    if (!isNaN(parseFloat(word))) return [word];

    const substrings = new Set();
    for (let i = 0; i < word?.length; i++) {
        for (let j = i + 2; j <= word?.length; j++) {
            substrings.add(word.slice(i, j).replace(/[,.]/g, ""));
        }
    }
    return Array.from(substrings);
};

const makeHash = async (data, schemaName, hashElements, passedClient = null) => {
    const pool = db.getPool();
    const client = passedClient || (await pool.connect());
    let isLocalClient = !passedClient;

    try {
        if (isLocalClient) await client.query("BEGIN");

        for (const elementKey of hashElements) {
            const value = data[elementKey];
            if (!value || typeof value === "object") continue;

            const text = value.toString().toLowerCase().trim();
            const words = text.split(/\s+/).filter(Boolean);

            for (const word of words) {
                const substrings = generateSubstrings(word);

                for (const substring of substrings) {
                    await addHashVariations(client, substring, elementKey, data.id, schemaName);
                }
            }
        }

        if (isLocalClient) await client.query("COMMIT");
    } catch (err) {
        if (isLocalClient) await client.query("ROLLBACK");
        throw err;
    } finally {
        if (isLocalClient) client.release();
    }
};

module.exports = { makeHash };
