const crypto = require('crypto');
const deployKey = 123;
const timeSegment = Math.floor(Date.now() / 200000);
const input = timeSegment + deployKey;
const hash = crypto.createHash('sha256').update(input.toString()).digest('hex').slice(0, 4).toLocaleUpperCase();
console.log(hash);