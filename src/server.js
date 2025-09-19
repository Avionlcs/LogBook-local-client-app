const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const cookieParser = require('cookie-parser');
const axios = require('axios');

const app = express();

const PORT = process.env.PORT || 6300;

app.use(bodyParser.json({ limit: "100mb" }));
app.use(bodyParser.urlencoded({ limit: "100mb", extended: true }));
app.use(cors({ origin: "*" }));
app.use(cookieParser());

const authMiddleware = require('./middleware/authentication.middleware');
app.use(authMiddleware.auth);
const creditMiddleware = require("./middleware/creditMiddleware");
app.use(creditMiddleware);
const logsMiddleware = require('./middleware/logs.middleware');
app.use(logsMiddleware);

const isPkg = typeof process.pkg !== "undefined";
const basePath = isPkg ? path.dirname(process.execPath) : __dirname;
const staticFilesPath = path.join(basePath, "static");
app.use(express.static(staticFilesPath));
// app.use((req, res, next) => {
//     //console.log('aaa ** **  * * ', req.url);

//     next();

// });

app.get("/", (req, res) => {
    res.sendFile(path.join(staticFilesPath, "index.html"));
});

const apiRoutes = require("./api/api.routes");

const dataRoutes = require("./routes/dataRoutes");
const authRoutes = require("./routes/authRoutes").router;
const utilityRoutes = require("./routes/utilityRoutes");
const printRoutes = require("./routes/printRoutes");

app.use("/api", apiRoutes);
app.use("/", utilityRoutes);
app.use("/", dataRoutes);
app.use("/", authRoutes);
app.use("/", printRoutes);

app.use((err, req, res, next) => {
    if (err instanceof require("multer").MulterError) {
        // //console.log(`Multer error: `, err);
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).send({ error: "File size exceeds the limit of 200MB." });
        }
    }
    next(err);
});

app.get("/network-interfaces", (req, res) => {
    const addresses = [{ ip: '127.0.0.1', processId: process.pid }];
    res.json(addresses);
});

app.listen(PORT, "0.0.0.0", async () => {
    try {
        await axios.get(`http://localhost:90/add_server_url/${PORT}`);
    } catch (error) {
        ////console.log(`Failed to register server URL: ${error.message}`);
    }
});

