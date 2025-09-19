const bulkStatusService = require("../services/bulkStatusService");

module.exports = async (req, res) => {
  try {
    const st = await bulkStatusService.get(req.params.processId);
    if (!st) return res.status(404).send({ error: "Process not found" });
    res.json(st);
  } catch (e) {
    res.status(500).send({ error: e.message });
  }
};
