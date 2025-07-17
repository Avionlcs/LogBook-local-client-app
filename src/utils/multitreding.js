// threadedExecutor.js
const { Worker } = require('worker_threads');
const path = require('path');

function runInNewThread(fn, ...args) {
    return new Promise((resolve, reject) => {
        const worker = new Worker(`
      const { parentPort } = require('worker_threads');
      parentPort.on('message', ({ fnStr, args }) => {
        const fn = eval('(' + fnStr + ')');
        Promise.resolve(fn(...args))
          .then(result => parentPort.postMessage({ result }))
          .catch(error => parentPort.postMessage({ error: error.toString() }));
      });
    `, { eval: true });

        worker.on('message', ({ result, error }) => {
            if (error) reject(new Error(error));
            else resolve(result);
            worker.terminate();
        });

        worker.on('error', reject);
        worker.on('exit', code => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });

        const fnStr = fn.toString();
        worker.postMessage({ fnStr, args });
    });
}

module.exports = { runInNewThread };