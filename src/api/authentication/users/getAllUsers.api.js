const { HashSearch } = require("../../../utils/dbUtils");

module.exports = async (req, res) => {
    try {
        let users = getUsersByPermission
        res.json(sales);
    } catch (error) {
        console.error("Error fetching initial sales summary:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};