#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const admin = require('firebase-admin');
const crypto = require('crypto');

const rootDir = process.cwd();
const frontendDir = path.join(rootDir, 'frontend');
const exportDir = path.join(rootDir, 'export');
const distDir = path.join(exportDir, 'dist');

const FIREBASE_STORAGE_BUCKET = 'gs://logbook-440cb.firebasestorage.app';
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: FIREBASE_STORAGE_BUCKET
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function uploadToFirebase(buffer, destPath) {
    try {
        const file = bucket.file(destPath);
        await file.save(buffer, {
            contentType: 'application/zip',
        });
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491',
        });
        return url;
    } catch (error) {
        throw error;
    }
}

(async () => {
    try {
        let version;
        try {
            version = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
        } catch (err) {
            process.exit(1);
        }
        if (!version) {
            process.exit(1);
        }
        const cleanedVersion = version.trim().replace(/[^a-zA-Z0-9.-]/g, '_');
        let versionKey = cleanedVersion;
        let versionNumber = 1;

        const versionDoc = await db.collection('versions').doc(versionKey).get();

        let commitMessage = '';
        try {
            commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
        } catch (err) { }
        if (commitMessage) {
            commitMessage = commitMessage.replace(/_DF\d+_DF/g, '').trim();
            const prefixMatch = commitMessage.match(/^([^:]+:)\s*(.*)$/);
            if (prefixMatch) {
                commitMessage = prefixMatch[2].trim();
            }
        }

        let versionObj = {
            key: versionKey,
            latestVersion: versionNumber,
            status: 'building',
            timestamp: new Date().toISOString(),
        };

        if (versionDoc.exists) {
            versionObj = { ...versionObj, ...versionDoc.data() };
            versionObj.latestVersion = (versionDoc.data().latestVersion || 0) + 1;
            if (versionObj.url) {
                try {
                    const prevUrl = versionObj.url;
                    const match = prevUrl.match(/\/releases\/([a-f0-9]+\.zip)/);
                    if (match && match[1]) {
                        const prevZipPath = `releases/${match[1]}`;
                        const prevFile = bucket.file(prevZipPath);
                        await prevFile.delete({ ignoreNotFound: true });
                    }
                } catch (err) { }
            }
        }

        try {
            fs.readdirSync(process.cwd());
        } catch (e) { }

        // if (!fs.existsSync(frontendDir)) throw new Error(`Frontend directory not found: ${frontendDir}`);
        // process.chdir(frontendDir);
        // try {
        //     execSync('ng build', { stdio: 'inherit' });
        // } catch (err) {
        //     console.log(`Error building frontend: `, err);

        //     throw err;
        // }

        // process.chdir(rootDir);
        try {
            execSync('npx webpack', { stdio: 'inherit' });
        } catch (err) {
            throw err;
        }
        if (!fs.existsSync(exportDir)) throw new Error(`Export directory not found: ${exportDir}`);

        // Hash all files in exportDir (excluding .zip) for zip name
        const exportFilesForHash = fs.readdirSync(exportDir)
            .filter(f => !f.endsWith('.zip'))
            .map(f => path.join(exportDir, f));
        const hash = crypto.createHash('sha256');
        for (const filePath of exportFilesForHash) {
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                hash.update(fs.readFileSync(filePath));
            }
        }
        const hashHex = hash.digest('hex');
        const zipFileName = `${hashHex}.zip`;

        // Zip the entire exportDir (excluding .zip files)
        const zip = new AdmZip();
        const addFolderRecursive = (folderPath, zipPath = '') => {
            const items = fs.readdirSync(folderPath);
            for (const item of items) {
                if (item.endsWith('.zip')) continue;
                const fullPath = path.join(folderPath, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    zip.addLocalFolder(fullPath, path.join(zipPath, item));
                } else {
                    zip.addLocalFile(fullPath, zipPath);
                }
            }
        };
        addFolderRecursive(exportDir);

        const zipBuffer = zip.toBuffer();

        const releaseDestPath = `releases/${zipFileName}`;
        const zipUrl = await uploadToFirebase(zipBuffer, releaseDestPath);

        versionObj.url = zipUrl;
        versionObj.timestamp = new Date().toISOString();
        versionObj.status = 'completed';
        versionObj.description = commitMessage || `Deployment for version ${versionKey}`;
        await db.collection('versions').doc(versionKey).set(versionObj, { merge: true });

        process.chdir(rootDir);
    } catch (error) {
        process.exit(1);
    }
})();
