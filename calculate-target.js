const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

var IGNORE_DIRS = [
    'export',
    '.yarn',
    'data',
    'dist',
    'frontend/.eslintrc.js',
    'frontend/.gitignore',
    'frontend/.prettierrc',
    'package-lock.json',
    'node_modules',
    'frontend/node_modules',
    'frontend/.yarn',
    'frontend/dist',
    'frontend/export',
    'frontend/.angular',
    'frontend/.editorconfig',
    'out',
    'src/data',
    'logbook-440cb-firebase-adminsdk-fbsvc-d830ad118d.json',
    '.gitignore',
    '.git',
    'firebase.json',
    'deploy-check.yml',
    'calculate-target.js',
    'deploy-key.js',
    'encoded.txt',
    'db.lock.js',
    'ss.json',
    'package-lock.json',
    'frontend/package-lock.json',
    'frontend/yarn.lock',
    'frontend/src/@types'
];

const BASE_DIR = process.cwd();

function walk(dir, base, currentRel = '') {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const relPath = path.join(currentRel, file);
        const normRelPath = relPath.replace(/\\/g, '/');
        const stat = fs.statSync(fullPath);
        if (normRelPath == 'app.js') {
            if (!IGNORE_DIRS.includes(normRelPath)) {
                if (stat && stat.isDirectory()) {
                    results = results.concat(walk(fullPath, base, relPath));
                } else {
                    results.push(relPath);
                }
            }
        }
    });
    return results;
}

const fileList = walk(BASE_DIR, BASE_DIR).map(relPath => ({
    fullPath: path.join(BASE_DIR, relPath),
    normRelPath: relPath.replace(/\\/g, '/')
})).sort((a, b) => a.normRelPath.localeCompare(b.normRelPath));

const hash = crypto.createHash("sha256");

for (const file of fileList) {
    const content = fs.readFileSync(file.fullPath, 'utf8').replace(/\r\n/g, '\n');
    hash.update(content, 'utf8');
    hash.update(file.normRelPath, 'utf8');
}

const digest = hash.digest("hex");
const deployKey = 1243;
const now = Date.now();
const minutes = Math.floor(now / 60000);
const timeSegment = Math.floor(minutes / 4);

const input = timeSegment + deployKey;
const hash2 = crypto.createHash('sha256')
    .update(input.toString() + digest)
    .digest('hex')
    .slice(0, 4)
    .toLocaleUpperCase();

console.log(hash2);