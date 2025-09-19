const readRangeService = require("../services/readRangeService");

module.exports = async (req, res) => {
  try {
    const { entity, start, end } = req.params;
    const out = await readRangeService(entity, parseInt(start, 10), parseInt(end, 10));
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
