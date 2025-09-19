const searchService = require("../services/searchService");

module.exports = async (req, res) => {
  try {
    const { keyword, schema, filterBy, limit } = req.query;
    const out = await searchService(keyword, schema, filterBy, parseInt(limit || "0", 10));
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
