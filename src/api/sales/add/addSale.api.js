const db = require("../../../config/dbConfig");

module.exports = async (req, res) => {
    const pool = db.getPool();
    const client = await pool.connect();

    try {

    } catch (error) {
        console.error("DB Query Error:", error);
        return res.status(500).json({ success: false, error: "Internal server error" });
    } finally {
        client.release();
    }
};
