// calculate-target.js
const crypto = require('crypto');

function calculateTarget(deployKey, timeWindowSeconds = 3600) {
    if (!deployKey) {
        throw new Error('DEPLOY_KEY environment variable is not set');
    }

    // Calculate target based on current time and deploy key
    const timestamp = Date.now();
    const timeBucket = Math.floor(timestamp / (timeWindowSeconds * 1000));
    const targetValue = timeBucket + parseInt(deployKey, 10);

    // Generate SHA-256 hash and take first 8 characters
    const hash = crypto.createHash('sha256').update(targetValue.toString()).digest('hex').slice(0, 8);
    const target = `DF${hash}`;

    return target;
}

try {
    const deployKey = process.env.DEPLOY_KEY || '4578';
    const timeWindow = process.env.TIME_WINDOW_SECONDS || '3600'; // Default to 1 hour
    const target = calculateTarget(deployKey, parseInt(timeWindow, 10));
    console.log(`::set-output name=target::${target}`);
    console.log(`Calculated Target: ${target}`);
} catch (error) {
    console.error('Error calculating target:', error.message);
    process.exit(1);
}