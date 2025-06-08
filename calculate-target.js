const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const IGNORE_DIRS = ["node_modules", ".git", "export", "dist", "data", "encoded.txt", "calculate-target.js", "package-lock.json", "ss.json"];
const BASE_DIR = process.cwd();

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (!IGNORE_DIRS.includes(file)) {
            if (stat && stat.isDirectory()) {
                results = results.concat(walk(fullPath));
            } else {

                results.push(fullPath);
            }
        }
    });
    return results;
}

const files = walk(BASE_DIR).sort();
const hash = crypto.createHash("sha256");

for (const file of files) {
    hash.update(fs.readFileSync(file));
    hash.update(file);
}

const digest = hash.digest("hex")
const deployKey = 1243;
const timeSegment = Math.floor(Date.now() / 200000);
const input = timeSegment + deployKey;
const hash2 = crypto.createHash('sha256').update(input.toString() + digest).digest('hex').slice(0, 4).toLocaleUpperCase();
console.log(hash2)