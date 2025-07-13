const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const app = express();
const cookieParser = require('cookie-parser');
const net = require('net');
const axios = require('axios');


async function findAvailablePort(startPort, callback) {
    const MAX_ATTEMPTS = 1000;
    const CONCURRENT_CHECKS = 50;
    const endPort = startPort + MAX_ATTEMPTS;

    const checkPort = (port) => {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.unref();
            server.on('error', () => resolve(false));
            server.listen({ port, host: '0.0.0.0' }, () => {
                server.close(() => resolve(true));
            });
        });
    };

    const checkPortBatch = async (start, end) => {
        const ports = Array.from({ length: end - start + 1 }, (_, i) => start + i);
        const results = await Promise.all(ports.map(checkPort));
        return ports.find((port, i) => results[i]);
    };

    for (let current = startPort; current <= endPort; current += CONCURRENT_CHECKS) {
        const batchEnd = Math.min(current + CONCURRENT_CHECKS - 1, endPort);
        const availablePort = await checkPortBatch(current, batchEnd);
        if (availablePort) {
            callback(availablePort);
            return;
        }
    }

    const fallbackServer = net.createServer();
    fallbackServer.listen(0, '0.0.0.0', () => {
        const assignedPort = fallbackServer.address().port;
        fallbackServer.close(() => callback(assignedPort));
    });
}

app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
app.use(cors({ origin: "*" }));
app.use(cookieParser());

const authMiddleware = require('./src/middleware/authentication.middleware');
app.use(authMiddleware.auth);
const creditMiddleware = require("./src/middleware/creditMiddleware");
app.use(creditMiddleware);
const logsMiddleware = require('./src/middleware/logs.middleware');
app.use(logsMiddleware);

const isPkg = typeof process.pkg !== "undefined";
const basePath = isPkg ? path.dirname(process.execPath) : __dirname;
const staticFilesPath = path.join(basePath, "out", "dist", "frontend", "browser");
app.use(express.static(staticFilesPath));

app.get("/", (req, res) => {
    res.sendFile(path.join(staticFilesPath, "index.html"));
});

const dataRoutes = require("./src/routes/dataRoutes");
const authRoutes = require("./src/routes/authRoutes").router;
const utilityRoutes = require("./src/routes/utilityRoutes");
const printRoutes = require("./src/routes/printRoutes");

app.use("/", utilityRoutes);
app.use("/", dataRoutes);
app.use("/", authRoutes);
app.use("/", printRoutes);

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


findAvailablePort(5300, async (availablePort) => {
    app.locals.port = availablePort;
    app.listen(availablePort, "0.0.0.0", async () => {
        try {
            await axios.get(`http://localhost:90/add_server_url/${availablePort}`);
        } catch (error) {
            console.log(`Failed to register server URL: ${error.message}`, error);
        }
        console.log(`Server running on http://localhost:${availablePort}`);
    });
});