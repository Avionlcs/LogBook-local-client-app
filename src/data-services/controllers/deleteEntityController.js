const deleteEntityService = require("../services/deleteEntityService");

module.exports = async (req, res) => {
  try {
    const out = await deleteEntityService(req.params.entity, req.params.id);
    if (!out.success) return res.status(out.message === "Item not found" ? 404 : 500).send(out);
    res.json(out);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
