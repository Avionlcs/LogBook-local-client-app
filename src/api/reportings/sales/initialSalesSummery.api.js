const { HashSearch } = require("../../../utils/dbUtils");

module.exports = async (req, res) => {
    try {
        let currentYear = new Date().getFullYear();
        let currentMonth = new Date().getMonth() + 1;
        let keywords = [
            `timestampy${currentYear}`,
            `timestampm${currentMonth.toString().padStart(2, '0')}`
        ].join(' ');

        let sales = await HashSearch(keywords, 'sales', 'timestamp', parseInt(1000, 10));
        res.json(sales);
    } catch (error) {
        console.error("Error fetching initial sales summary:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};