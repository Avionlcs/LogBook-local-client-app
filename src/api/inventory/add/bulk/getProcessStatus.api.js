const { getBulkStatus } = require("../../../../utils/bulkProcessStatus");

module.exports = async (req, res) => {
    const { processId } = req.params;

    try {
        const status = await getBulkStatus(processId);
        if (!status) {
            return res.status(404).json({ success: false, message: 'Status not found' });
        }

        return res.json(status);
    } catch (err) {
        console.error('Error getting bulk status:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};