const updateEntityService = require("../services/updateEntityService");

module.exports = async (req, res) => {
  try {
    const out = await updateEntityService(req.params.entity, req.params.id, req.body);
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
