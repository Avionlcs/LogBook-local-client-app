const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const app = express();
const cookieParser = require('cookie-parser');

const port = 90;

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
const logsMiddleware = require('./src/middleware/logs.middleware')
app.use(logsMiddleware)
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
const { addData } = require("./src/utils/dbUtils");
const { createKeyStream, createReadStream } = require("./src/config/dbConfig");


(async () => {
    console.log('||||');
    var count = 0;
    const stream = await createReadStream({ entity: 'inventory_items' });
    console.log("Stream created:", stream, 'KKKKKKKK');

    //  console.log("Stream created:", stream);

    // for await (var key of stream) {
    //     key = key.toString()
    //     if (typeof key === "string" && key.startsWith("user:") && !key.startsWith("user:phone:")) {
    //         count++;
    //     }
    // }
    // console.log("User count in DB:", stream);
})();


app.get("/network-interfaces", (req, res) => {
    const addresses = getNetworkInterfaces(port);
    res.json(addresses);
});

app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${port}`);
});  