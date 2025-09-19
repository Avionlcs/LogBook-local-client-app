const addEntityService = require("../services/addEntityService");

module.exports = async (req, res) => {
  try {
    const out = await addEntityService(req.params.entity, req.body);
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
