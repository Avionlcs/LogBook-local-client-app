const http = require('http');

const TARGETS = ['/health', '/datenow'];
const TOTAL_REQUESTS = 3;
const CONCURRENCY = 5;
const HOST = 'http://localhost:90';

async function sendRequest(path) {
    return new Promise(resolve => {
        const start = Date.now();
        http.get(HOST + path, res => {
            res.on('data', () => { });
            res.on('end', () => resolve(Date.now() - start));
        }).on('error', () => resolve(null));
    });
}

async function runLoadTest() {
    const allTimes = [];

    for (const path of TARGETS) {
        const queue = Array(TOTAL_REQUESTS).fill(null);

        while (queue.length) {
            const batch = queue.splice(0, CONCURRENCY);
            const times = await Promise.all(batch.map(() => sendRequest(path)));
            allTimes.push(...times.filter(Boolean));
        }
    }

    const avg = allTimes.reduce((a, b) => a + b, 0) / allTimes.length;
    const score = Math.round(100000 / avg); // higher = better

    console.log(`Server Score: ${score}`);
}

runLoadTest();
