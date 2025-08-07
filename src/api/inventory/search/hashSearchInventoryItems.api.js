const db = require("../../../config/dbConfig");
const { searchHash } = require("../../../config/tables/hash/helpers/searchHash.helper");

module.exports = async (req, res) => {
    try {
        // Accept parameters from query string or JSON body (if you prefer POST)
        const keyword = req.query.keyword || req.body?.keyword;
        const elementKey = req.query.elementKey || req.body?.elementKey || null;
        const schemaName = req.query.schemaName || req.body?.schemaName || null;

        if (!keyword || typeof keyword !== 'string' || keyword.length < 2) {
            return res.status(400).json({ success: false, error: 'Keyword must be a string with length >= 2' });
        }

        const results = await searchHash({ keyword, elementKey, schemaName });
        res.json({ success: true, referenceIds: results });
    } catch (error) {
        console.error('Search hash error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}