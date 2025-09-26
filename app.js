const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    const numCPUs = 1;
    cluster.schedulingPolicy = cluster.SCHED_RR;

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
               cluster.fork();
    });
} else {
     require('./src/server.js');
}
