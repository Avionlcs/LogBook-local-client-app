const { HashSearch } = require("../../../utils/dbUtils");

module.exports = async (req, res) => {
    let keywords = req.query.keywords || '';
    if (!keywords) {
        return res.status(400).json({ error: "Keywords query parameter is required." });
    }

    try {
        let sales = await HashSearch(keywords, 'sales', undefined, parseInt(1000, 10));
        res.json(sales);
    } catch (error) {
        console.error("Error fetching initial sales summary:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};