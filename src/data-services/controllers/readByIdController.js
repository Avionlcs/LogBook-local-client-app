const readByIdService = require("../services/readByIdService");

module.exports = async (req, res) => {
  try {
    const out = await readByIdService(req.params.entity, req.params.id);
    if (!out) return res.status(404).send({ error: "Item not found" });
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
