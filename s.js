const http = require('http');

const HOST = 'localhost';
const PORT = 6300;
const PATH = '/network-interfaces';

const TOTAL_REQUESTS = 10000;  // 10k total requests
const CONCURRENT_REQUESTS = 200;  // max 200 parallel


let completed = 0;

function makeRequest(id) {
    return new Promise((resolve) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: PATH,
            method: 'GET',
            headers: {
                Connection: 'close' // disable keep-alive to force new connection
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json && json[0] && json[0].processId) {
                        console.log(`Request #${id} handled by PID: ${json[0].processId}`);
                    } else {
                        console.log(`Request #${id} received invalid data`);
                    }
                } catch (e) {
                    console.log(`Request #${id} failed to parse JSON`);
                }
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`Request #${id} error: ${e.message}`);
            resolve();
        });

        req.end();
    });
}

async function run() {
    console.log(`Starting stress test: ${TOTAL_REQUESTS} requests, max ${CONCURRENT_REQUESTS} concurrent`);

    let running = 0;
    let next = 1;

    function launchNext() {
        if (next > TOTAL_REQUESTS) {
            if (running === 0) {
                console.log('Stress test completed');
            }
            return;
        }

        running++;
        makeRequest(next).then(() => {
            running--;
            launchNext();
        });
        next++;

        if (running < CONCURRENT_REQUESTS && next <= TOTAL_REQUESTS) {
            launchNext();
        }
    }

    launchNext();
}

run();
