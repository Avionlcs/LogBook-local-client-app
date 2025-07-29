const db = require('../config/dbConfig');

// Save or update status
async function saveBulkStatus(processId, status) {
    const key = `bulk:${processId}`;
    const data = {
        ...status,
        lastUpdated: new Date().toISOString()
    };
    await db.put(key, JSON.stringify(data));
}

// Get status
async function getBulkStatus(processId) {
    const key = `bulk:${processId}`;
    const raw = await db.get(key);
    return raw ? JSON.parse(raw) : null;
}

// Delete old completed/failed statuses (>1 hour)
async function cleanupOldStatuses() {
    try {
        const stream = await db.createKeyStream();
        const now = Date.now();

        for await (const key of stream) {
            if (!key.startsWith('bulk:')) continue;

            const raw = await db.get(key);
            if (!raw) continue;

            const status = JSON.parse(raw);

            // Check condition: completed or failed & older than 1 hour
            if (
                now - new Date(status.lastUpdated).getTime() > 3600 * 1000
            ) {
                await db.del(key);
            }
        }
    } catch (err) {
        console.error('Cleanup error:', err.message);
    }
}

// Run cleanup every hour
setInterval(cleanupOldStatuses, 3600 * 1000);

module.exports = {
    saveBulkStatus,
    getBulkStatus,
    cleanupOldStatuses
};
