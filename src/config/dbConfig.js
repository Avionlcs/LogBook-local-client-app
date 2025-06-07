const levelup = require("levelup");
const leveldown = require("leveldown");
const path = require("path");
const { existsSync, unlinkSync } = require("fs");

const isPkg = typeof process.pkg !== "undefined";
const basePath = isPkg ? path.dirname(process.execPath) : __dirname;
const dbPath = path.join(basePath, "../data");
const lockFilePath = path.join(dbPath, "LOCK");

const clearLockFile = () => {
    if (existsSync(lockFilePath)) {
        unlinkSync(lockFilePath);
    }
};

clearLockFile();

const db = levelup(leveldown(dbPath));

module.exports = db; 