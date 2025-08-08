const db = require("../../../config/dbConfig");
const { makeHash } = require("../../../config/tables/hash/helpers/makeHashes.helper");
const { searchHash } = require("../../../config/tables/hash/helpers/searchHash.helper");

const searchByPostgres = async (keyword) => {
    const pool = db.getPool();
    const lowerKeyword = keyword.toLowerCase();

    const query = `
        SELECT * FROM inventory_items
        WHERE LOWER(name) LIKE $1 OR LOWER(barcode) LIKE $1
    `;

    const queryParams = [`%${lowerKeyword}%`];
    const { rows } = await pool.query(query, queryParams);
    return rows;
};

const calculateRelevanceScore = (result, keyword, filterBy) => {
    let score = 0;
    const lowerKeyword = keyword.toLowerCase();
    const nameLower = result.name.toLowerCase();

    const wholeWordRegex = new RegExp(`\\b${lowerKeyword}\\b`, 'i');
    const startOfNameRegex = new RegExp(`^${lowerKeyword}`, 'i');
    const startOfWordRegex = new RegExp(`\\b${lowerKeyword}`, 'i');

    if (wholeWordRegex.test(nameLower)) {
        score += 1000;
        if (startOfNameRegex.test(nameLower)) {
            score += 500;
        } else if (startOfWordRegex.test(nameLower)) {
            score += 300;
        }
    } else if (startOfWordRegex.test(nameLower)) {
        score += 500;
    } else if (nameLower.includes(lowerKeyword)) {
        score += 100;
    }

    if (filterBy === 'name' && nameLower.includes(lowerKeyword)) {
        score += 500;
    }

    score *= 10;

    if (result.created_at) {
        const creationDate = new Date(result.created_at);
        const now = new Date();
        const daysOld = (now - creationDate) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 50 - daysOld);
    }

    return score;
};

module.exports = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {
        const keyword = req.query.keyword || req.body?.keyword;

        if (!keyword || typeof keyword !== 'string' || keyword.length < 2) {
            client.release();
            return res.status(400).json({
                success: false,
                error: 'Keyword must be a string with length >= 2',
            });
        }

        const referenceIds = await searchHash(keyword);
        console.log('|||| ', referenceIds);

        let items = [];

        if (referenceIds && referenceIds.length > 0) {
            const result = await client.query(
                `SELECT * FROM inventory_items WHERE id = ANY($1::uuid[])`,
                [referenceIds]
            );
            items = result.rows;
        } else {
            items = await searchByPostgres(keyword);
            if (items.length > 0) {
                const hashElements = Object.keys(items[0]);

                (async () => {
                    try {
                        for (const item of items) {
                            await makeHash(item, 'inventory_items', hashElements, client);
                        }
                    } catch (err) {
                        console.error('Background hash error:', err);
                    } finally {
                        client.release();
                    }
                })();
            }

        }

        // Sort before responding
        items.sort((a, b) => {
            const scoreA = calculateRelevanceScore(a, keyword);
            const scoreB = calculateRelevanceScore(b, keyword);
            return scoreB - scoreA;
        });

        // Release client if not released by background task
        if (referenceIds && referenceIds.length > 0) {
            client.release();
        }

        return res.json({ success: true, items });
    } catch (error) {
        client.release();
        console.error('Search error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

