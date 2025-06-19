const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const app = express();
const cookieParser = require('cookie-parser');
const net = require('net');
const axios = require('axios');
const getPort = require('get-port');


async function findAvailablePort(startPort, callback) {
    const MAX_ATTEMPTS = 1000;
    const CONCURRENT_CHECKS = 50; // Number of ports to check in parallel
    const endPort = startPort + MAX_ATTEMPTS;

    // Check if a single port is available
    const checkPort = (port) => {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.unref(); // Prevents keeping the server open unnecessarily
            server.on('error', () => resolve(false)); // Port unavailable
            server.listen({ port, host: '0.0.0.0' }, () => {
                server.close(() => resolve(true)); // Port available
            });
        });
    };

    // Check a batch of ports in parallel
    const checkPortBatch = async (start, end) => {
        const ports = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const results = await Promise.all(ports.map(checkPort));
        return ports.find((port, i) => results[i]);
    };

    // Scan ports in batches for efficiency
    for (let current = startPort; current <= endPort; current += CONCURRENT_CHECKS) {
        const batchEnd = Math.min(current + CONCURRENT_CHECKS - 1, endPort);
        const availablePort = await checkPortBatch(current, batchEnd);
        if (availablePort) {
            callback(availablePort);
            return;
        }
    }

    // Fallback: Let the OS assign any available port
    const fallbackServer = net.createServer();
    fallbackServer.listen(0, '0.0.0.0', () => {
        const assignedPort = fallbackServer.address().port;
        fallbackServer.close(() => callback(assignedPort));
    });
}

// Middleware setup
app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
app.use(cors({ origin: "*" }));
app.use(cookieParser());
app.use((req, res, next) => {
    // if (req.method !== "GET") console.log(`${req.method} ${req.originalUrl}`);
    next();
});

const authMiddleware = require('./src/middleware/authentication.middleware');
app.use(authMiddleware.auth);
const creditMiddleware = require("./src/middleware/creditMiddleware");
app.use(creditMiddleware);
const logsMiddleware = require('./src/middleware/logs.middleware');
app.use(logsMiddleware);

// Static files setup
const isPkg = typeof process.pkg !== "undefined";
const basePath = isPkg ? path.dirname(process.execPath) : __dirname;
const staticFilesPath = path.join(basePath, "out", "dist", "frontend", "browser");
app.use(express.static(staticFilesPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(staticFilesPath, "index.html"));
});

// Routes 
const dataRoutes = require("./src/routes/dataRoutes");
const authRoutes = require("./src/routes/authRoutes").router;
const utilityRoutes = require("./src/routes/utilityRoutes");
const printRoutes = require("./src/routes/printRoutes");

app.use("/", utilityRoutes);
app.use("/", dataRoutes);
app.use("/", authRoutes);
app.use("/", printRoutes);

// Error handling for multer
app.use((err, req, res, next) => {
    if (err instanceof require("multer").MulterError) {
        console.log(`Multer error: `, err);
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).send({ error: "File size exceeds the limit of 200MB." });
        }
    }
    next(err);
});

const { getNetworkInterfaces } = require("./src/utils/networkUtils");

app.get("/network-interfaces", (req, res) => {
    const addresses = getNetworkInterfaces(app.locals.port);
    res.json(addresses);
});

// app.post('/add_server_url', async (req, res) => {
//     try {
//         const response = await axios.post('http://localhost:90/add_server_url', req.body, {
//             headers: req.headers
//         });
//         res.status(response.status).send(response.data);
//     } catch (error) {
//         if (error.response) {
//             res.status(error.response.status).send(error.response.data);
//         } else {
//             res.status(500).send({ error: 'Failed to connect to localhost:90/add_server_url' });
//         }
//     }l
// }); 

// Start server and set port
findAvailablePort(90, async (availablePort) => {
    app.locals.port = availablePort; // Store port for use in routes


    app.listen(availablePort, "0.0.0.0", async () => {
        try {
            await axios.get(`http://localhost:90/add_server_url/${availablePort}`);
        } catch (error) {
            console.log(`Failed to register server URL: ${error.message}`, error);
        }
        console.log(`Server running on http://localhost:${availablePort}`);
    });
});


