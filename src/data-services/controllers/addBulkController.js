const addBulkService = require("../services/addBulkService");

module.exports = async (req, res) => {
  try {
    const schema = typeof req.body.requiredFields === "string"
      ? JSON.parse(req.body.requiredFields) : (req.body.requiredFields || {});
    const id = await addBulkService(req.params.entity, req.files, schema);
    res.json({ processId: id });
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
