function convertDateToCFSLabels(dateInput, elementKey) {
    const dateObj = new Date(dateInput);
    if (isNaN(dateObj)) return [];

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hour = String(dateObj.getHours()).padStart(2, '0');
    const minute = String(dateObj.getMinutes()).padStart(2, '0');
    const second = String(dateObj.getSeconds()).padStart(2, '0');
    const millisecond = String(dateObj.getMilliseconds()).padStart(3, '0');
    const weekOfMonth = Math.ceil(day / 7);

    return [
        `${elementKey}y${year}`,
        `${elementKey}m${month}`,
        `${elementKey}w${weekOfMonth}`,
        `${elementKey}d${day}`,
        `${elementKey}h${hour}`,
        `${elementKey}mm${minute}`,
        `${elementKey}ss${second}`,
        `${elementKey}ms${millisecond}`
    ];
}

module.exports = async (obj, schema, client, id) => {
    if (typeof obj !== 'object' || obj === null) return;

    const skipKeys = new Set(['permissions', 'password']); // customize if needed

    async function storeSubstring(substring, schema, elementKey, id) {
        if (!substring) return;

        substring = substring.toLowerCase();

        // Insert substring record if not exists
        await client.query(
            `
      INSERT INTO hash_table (hash, substring, schema_name, element_key)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (hash) DO NOTHING
      `,
            [substring, substring, schema, elementKey]
        );

        // Insert reference id if not exists
        await client.query(
            `
      INSERT INTO hash_reference_ids (hash, reference_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
            [substring, id]
        );
    }

    async function hashSubstrings(keywords, schema, key, id) {
        const words = keywords.split(/\s+/).filter(w => w.length > 0);

        for (const word of words) {
            // If numeric, insert full word only
            if (!isNaN(word)) {
                await storeSubstring(word, schema, key, id);
                continue;
            }

            // Insert all substrings length >= 2 (plain text)
            for (let i = 0; i < word.length; i++) {
                for (let j = i + 2; j <= word.length; j++) {
                    const sub = word.slice(i, j);
                    await storeSubstring(sub, schema, key, id);
                }
            }
        }
    }

    for (const [key, value] of Object.entries(obj)) {
        if (skipKeys.has(key)) continue;
        if (value === null || value === undefined) continue;
        if (typeof value === 'object') continue; // skip objects and arrays

        let keywords = value.toString().trim();

        // Date tokens
        if (['created_at', 'updated_at', 'last_updated', 'created', 'date', 'timestamp'].includes(key)) {
            const tokens = convertDateToCFSLabels(keywords, key);
            for (const token of tokens) {
                await storeSubstring(token, schema, key, id);
            }
            continue;
        }

        // Prefix user IDs
        if (key === 'user' || key.endsWith('_user_id')) {
            keywords = 'usr&' + keywords;
        }

        await hashSubstrings(keywords.toLowerCase(), schema, key, id);
    }
};
