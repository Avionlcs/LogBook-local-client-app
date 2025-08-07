// Import required dependencies
const db = require("../../../config/dbConfig"); // Database connection pool
const { searchHash } = require("../../../config/tables/hash/helpers/searchHash.helper"); // Helper function to get reference IDs

/**
 * Calculates a relevance score for an inventory item based on the keyword and optional filter.
 * @param {Object} result - The inventory item object.
 * @param {string} keyword - The search keyword.
 * @param {string|null} filterBy - Optional field to prioritize in scoring.
 * @returns {number} - The calculated relevance score.
 */
const calculateRelevanceScore = (result, keyword, filterBy) => {
    let score = 0;
    const lowerKeyword = keyword.toLowerCase();
    const nameLower = result.name.toLowerCase();

    // Regular expressions for matching
    const wholeWordRegex = new RegExp(`\\b${lowerKeyword}\\b`, 'i'); // Whole-word match
    const startOfNameRegex = new RegExp(`^${lowerKeyword}`, 'i'); // Keyword at start of name
    const startOfWordRegex = new RegExp(`\\b${lowerKeyword}`, 'i'); // Keyword at start of any word

    // Scoring for the 'name' field
    if (wholeWordRegex.test(nameLower)) {
        score += 1000; // High score for whole-word match
        if (startOfNameRegex.test(nameLower)) {
            score += 500; // Bonus for keyword at the start of name
        } else if (startOfWordRegex.test(nameLower)) {
            score += 300; // Bonus for keyword at the start of any word
        }
    } else if (startOfWordRegex.test(nameLower)) {
        score += 500; // Score for prefix match
    } else if (nameLower.includes(lowerKeyword)) {
        score += 100; // Low score for substring match
    }

    // Bonus if filterBy is 'name' and keyword is found
    if (filterBy === 'name' && nameLower.includes(lowerKeyword)) {
        score += 500;
    }

    // Emphasize name field matches
    score *= 10;

    // Recency bonus: newer items get a boost
    if (result.created_at) {
        const creationDate = new Date(result.created_at);
        const now = new Date();
        const daysOld = (now - creationDate) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 50 - daysOld); // Up to 50 points for newer items
    }

    return score;
};

/**
 * API endpoint to search inventory items based on a keyword.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
module.exports = async (req, res) => {
    try {
        // Extract parameters from query or body
        const keyword = req.query.keyword || req.body?.keyword;
        const elementKey = req.query.elementKey || req.body?.elementKey || null;
        const schemaName = req.query.schemaName || req.body?.schemaName || null;
        const filterBy = req.query.filterBy || req.body?.filterBy || null;

        // Validate keyword
        if (!keyword || typeof keyword !== 'string' || keyword.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Keyword must be a string with length >= 2'
            });
        }

        // Step 1: Get reference IDs from searchHash
        const referenceIds = await searchHash(keyword, elementKey, schemaName);

        // If no matches found, return empty result
        if (!referenceIds || referenceIds.length === 0) {
            return res.json({ success: true, items: [] });
        }

        // Step 2: Query database for full inventory items
        const pool = db.getPool();
        const { rows: items } = await pool.query(
            `SELECT * FROM inventory_items WHERE id = ANY($1::int[])`,
            [referenceIds]
        );

        // Step 3: Score and sort items
        items.sort((a, b) => {
            const scoreA = calculateRelevanceScore(a, keyword, filterBy);
            const scoreB = calculateRelevanceScore(b, keyword, filterBy);

            // Primary sort by relevance score
            if (scoreB !== scoreA) return scoreB - scoreA;

            // Tiebreaker 1: Keyword at start of name
            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            const keywordLower = keyword.toLowerCase();
            const aStartsWith = nameA.startsWith(keywordLower);
            const bStartsWith = nameB.startsWith(keywordLower);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;

            // Tiebreaker 2: Keyword frequency in name
            const freqA = (nameA.match(new RegExp(keywordLower, 'g')) || []).length;
            const freqB = (nameB.match(new RegExp(keywordLower, 'g')) || []).length;
            if (freqB !== freqA) return freqB - freqA;

            // Tiebreaker 3: Recency (newer first)
            const dateA = new Date(a.created_at || '1970-01-01');
            const dateB = new Date(b.created_at || '1970-01-01');
            return dateB - dateA;
        });

        // Return sorted items
        res.json({ success: true, items });

    } catch (error) {
        // Log error and return 500 response
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};