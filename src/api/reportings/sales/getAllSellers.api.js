const { getUsersByPermission } = require("../../../config/dbConfig");
const { HashSearch } = require("../../../utils/dbUtils");

module.exports = async (req, res) => {
    try {
        let users = await getUsersByPermission('sales');
        res.json(users);
    } catch (error) {
        console.error("Error fetching sellers:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};