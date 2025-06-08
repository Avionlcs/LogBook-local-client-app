const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

var IGNORE_DIRS = [
    'export',
    'frontend',
    '.yarn',
    'data',
    'dist',
    'frontend/.editorconfig',
    'frontend/.eslintrc.js',
    'frontend/.gitignore',
    'frontend/.prettierrc',
    'package-lock.json',
    'node_modules',
    'out',
    'src/data',
    'logbook-440cb-firebase-adminsdk-fbsvc-d830ad118d.json',
    '.gitignore',
    '.git',
    'firebase.json',
    'deploy-check.yml',
    'calculate-target.js',
    'encoded.txt',
    'db.lock.js',
    'ss.json'
];

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