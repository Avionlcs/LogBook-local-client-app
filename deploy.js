#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const admin = require('firebase-admin');
const crypto = require('crypto');

const rootDir = process.cwd();
const frontendDir = path.join(rootDir, 'client/network/app/frontend');
const exportDir = path.join(rootDir, 'client/network/app/export');
const distDir = path.join(exportDir, 'dist');

const FIREBASE_STORAGE_BUCKET = 'logbook-440cb.appspot.com';
const serviceAccount = require('./logbook-440cb-firebase-adminsdk-fbsvc-d830ad118d.json');

console.log('Initializing Firebase Admin...');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: FIREBASE_STORAGE_BUCKET
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function uploadToFirebase(buffer, destPath) {
    try {
        console.log(`Uploading ${destPath} to Firebase Storage...`);
        const file = bucket.file(destPath);
        await file.save(buffer, {
            contentType: 'application/zip',
        });
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491',
        });
        console.log(`Upload complete. File URL: ${url}`);
        return url;
    } catch (error) {
        console.error('Error uploading to Firebase:', error);
        throw error;
    }
}

(async () => {
    try {
        let version;
        try {
            console.log('Getting git branch name...');
            version = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
            console.log(`Current git branch: ${version}`);
        } catch (err) {
            console.error('Failed to get git branch name:', err);
            process.exit(1);
        }
        if (!version) {
            console.error('No git branch found.');
            process.exit(1);
        }
        const cleanedVersion = version.trim().replace(/[^a-zA-Z0-9.-]/g, '_');
        let versionKey = cleanedVersion;
        let versionNumber = 1;

        console.log(`Checking Firestore for version key: ${versionKey}`);
        const versionDoc = await db.collection('versions').doc(versionKey).get();

        let versionObj = {
            key: versionKey,
            latestVersion: versionNumber,
            status: 'building',
            timestamp: new Date().toISOString(),
        };

        if (versionDoc.exists) {
            console.log('Version document exists. Incrementing version.');
            versionObj = { ...versionObj, ...versionDoc.data() };
            versionObj.latestVersion = (versionDoc.data().latestVersion || 0) + 1;
            if (versionObj.url) {
                try {
                    const prevUrl = versionObj.url;
                    const match = prevUrl.match(/\/releases\/([a-f0-9]+\.zip)/);
                    if (match && match[1]) {
                        const prevZipPath = `releases/${match[1]}`;
                        const prevFile = bucket.file(prevZipPath);
                        console.log(`Deleting previous release: ${prevZipPath}`);
                        await prevFile.delete({ ignoreNotFound: true });
                    }
                } catch (err) {
                    console.warn('Failed to delete previous release:', err);
                }
            }
        }

        try {
            const files = fs.readdirSync(process.cwd());
            console.log('Current directory contents:', files);
        } catch (e) {
            console.warn('Could not list directory contents:', e);
        }

        if (!fs.existsSync(frontendDir)) throw new Error(`Frontend directory not found: ${frontendDir}`);
        console.log('Building Angular frontend...');
        process.chdir(frontendDir);
        execSync('npm install', { stdio: 'inherit' });
        process.chdir(rootDir);
        console.log('Running webpack...');
        try {
            execSync('npx webpack --no-progress', { stdio: 'inherit' });
        } catch (err) {
            console.error('Webpack build failed:', err);
            throw err;
        }

        if (!fs.existsSync(exportDir)) throw new Error(`Export directory not found: ${exportDir}`);
        process.chdir(exportDir);
        console.log('Building with ncc...');
        execSync('npx ncc build bundle.js -o dist', { stdio: 'inherit' });

        const outSrc = path.join(rootDir, 'out');
        const outDest = path.join(distDir, 'out');
        if (fs.existsSync(outSrc)) {
            console.log('Copying out directory...');
            fs.copySync(outSrc, outDest);
        }

        if (!fs.existsSync(distDir)) throw new Error(`Dist directory not found: ${distDir}`);
        process.chdir(distDir);
        console.log('Packaging with pkg...');
        execSync('npx pkg index.js --targets node16-win-x64,node16-linux-x64', { stdio: 'inherit' });

        console.log('Calculating hash for dist files...');
        const distFilesForHash = fs.readdirSync(distDir)
            .filter(f => !f.endsWith('.zip'))
            .map(f => path.join(distDir, f));
        const hash = crypto.createHash('sha256');
        for (const filePath of distFilesForHash) {
            const stat = fs.statSync(filePath);
            if (stat.isFile()) {
                hash.update(fs.readFileSync(filePath));
            }
        }
        const hashHex = hash.digest('hex');
        const zipFileName = `${hashHex}.zip`;

        console.log(`Creating zip archive: ${zipFileName}`);
        const zip = new AdmZip();
        const distFiles = fs.readdirSync(distDir);
        for (const file of distFiles) {
            const filePath = path.join(distDir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                zip.addLocalFolder(filePath, file);
            } else if (!f.endsWith('.zip')) {
                zip.addLocalFile(filePath);
            }
        }
        const zipBuffer = zip.toBuffer();

        const releaseDestPath = `releases/${zipFileName}`;
        const zipUrl = await uploadToFirebase(zipBuffer, releaseDestPath);

        versionObj.url = zipUrl;
        versionObj.timestamp = new Date().toISOString();
        versionObj.status = 'completed';
        console.log('Updating Firestore with new version info...');
        await db.collection('versions').doc(versionKey).set(versionObj, { merge: true });

        process.chdir(rootDir);
        console.log('Deployment completed successfully.');
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
})();