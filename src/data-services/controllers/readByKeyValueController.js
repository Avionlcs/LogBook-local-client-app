const readByKeyValueService = require("../services/readByKeyValueService");

module.exports = async (req, res) => {
  try {
    const { entity, key, value } = req.params;
    const out = await readByKeyValueService(entity, key, value);
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
