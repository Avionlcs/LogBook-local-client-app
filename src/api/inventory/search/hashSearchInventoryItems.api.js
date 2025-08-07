const db = require("../../../config/dbConfig");
const { searchHash } = require("../../../config/tables/hash/helpers/searchHash.helper");

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
    try {
        const keyword = req.query.keyword || req.body?.keyword;
        const elementKey = req.query.elementKey || req.body?.elementKey || null;
        const schemaName = req.query.schemaName || req.body?.schemaName || null;
        const filterBy = req.query.filterBy || req.body?.filterBy || null;

        if (!keyword || typeof keyword !== 'string' || keyword.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Keyword must be a string with length >= 2'
            });
        }

        const referenceIds = await searchHash(keyword, elementKey, schemaName);

        if (!referenceIds || referenceIds.length === 0) {
            return res.json({ success: true, items: [] });
        }

        const pool = db.getPool();
        const { rows: items } = await pool.query(
            `SELECT * FROM inventory_items WHERE id = ANY($1::int[])`,
            [referenceIds]
        );

        items.sort((a, b) => {
            const scoreA = calculateRelevanceScore(a, keyword, filterBy);
            const scoreB = calculateRelevanceScore(b, keyword, filterBy);

            if (scoreB !== scoreA) return scoreB - scoreA;

            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            const keywordLower = keyword.toLowerCase();
            const aStartsWith = nameA.startsWith(keywordLower);
            const bStartsWith = nameB.startsWith(keywordLower);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;

            const freqA = (nameA.match(new RegExp(keywordLower, 'g')) || []).length;
            const freqB = (nameB.match(new RegExp(keywordLower, 'g')) || []).length;
            if (freqB !== freqA) return freqB - freqA;

            const dateA = new Date(a.created_at || '1970-01-01');
            const dateB = new Date(b.created_at || '1970-01-01');
            return dateB - dateA;
        });

        res.json({ success: true, items });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};
