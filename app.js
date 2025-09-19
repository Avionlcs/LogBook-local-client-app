const cluster = require('cluster');
const os = require('os');

if (cluster.isMaster) {
    const numCPUs = 1; //os.cpus().length;
    cluster.schedulingPolicy = cluster.SCHED_RR;

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    // Restart worker if it dies
    cluster.on('exit', (worker, code, signal) => {
        // ////console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    // Worker: run your server code
    require('./src/server.js'); // this is your code (file with express setup)
}
