#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const admin = require('firebase-admin');
const crypto = require('crypto');

const rootDir = process.cwd();
const exportDir = path.join(rootDir, 'export');
const distDir = path.join(exportDir, 'dist');

const FIREBASE_STORAGE_BUCKET = 'gs://logbook-440cb.firebasestorage.app';
const serviceAccount = require('./serviceAccount.json');

console.log('Initializing Firebase...');
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
            console.log('Getting current git branch...');
            version = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
        } catch (err) {
            console.error('Failed to get git branch:', err);
            process.exit(1);
        }

        if (!version) {
            console.error('No git branch found.');
            process.exit(1);
        }

        const cleanedVersion = version.trim().replace(/[^a-zA-Z0-9.-]/g, '_');
        let versionKey = cleanedVersion;

        console.log(`Checking Firestore for version: ${versionKey}`);
        const versionDoc = await db.collection('versions').doc(versionKey).get();

        let versionNumber = 1;
        let versionObj = {
            key: versionKey,
            latestVersion: versionNumber,
            status: 'building',
            timestamp: new Date().toISOString(),
        };

        if (versionDoc.exists) {
            console.log('Version exists in Firestore. Incrementing version number.');
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

        let commitMessage = '';
        try {
            console.log('Getting latest git commit message...');
            commitMessage = execSync('git log -1 --pretty=%B').toString().trim();
        } catch (err) {
            console.warn('Failed to get commit message:', err);
        }

        if (commitMessage) {
            commitMessage = commitMessage.replace(/\|[^|]+\|/g, '').trim();
            const prefixMatch = commitMessage.match(/^([^:]+:)\s*(.*)$/);
            if (prefixMatch) {
                commitMessage = prefixMatch[2].trim();
            }
        }

        fs.removeSync(exportDir);
        fs.ensureDirSync(distDir);

        try {
            console.log('Installing dependencies...');
            execSync('npm install', { stdio: 'inherit' });
        } catch (err) {
            console.error('Dependency installation failed:', err);
            throw err;
        }

        console.log('Running ncc build...');
        execSync(`npx ncc build app.js -o ${distDir} --no-cache`, { stdio: 'inherit' });

        const outSrc = path.join(rootDir, 'out');
        const outDest = path.join(distDir, 'out');
        if (fs.existsSync(outSrc)) {
            console.log(`Copying out directory from ${outSrc} to ${outDest}`);
            fs.copySync(outSrc, outDest);
        }

        if (process.env.TARGET_OS === 'node16-win-x64') {
            console.log('Rebuilding native modules for Windows...');
            try {
                execSync('npm rebuild --arch=x64 --platform=win32', {
                    cwd: distDir,
                    stdio: 'inherit',
                });
            } catch (err) {
                console.error('Failed to rebuild native modules for Windows:', err);
                throw err;
            }
        }

        console.log('Packaging with pkg...');
        const target = process.env.TARGET_OS || 'node16-linux-x64';
        execSync(`npx pkg index.js --targets ${target}`, {
            cwd: distDir,
            stdio: 'inherit',
        });

        const indexJsPath = path.join(distDir, 'index.js');
        if (fs.existsSync(indexJsPath)) {
            console.log('Deleting index.js from dist directory...');
            fs.unlinkSync(indexJsPath);
        } else {
            console.log('index.js not found in dist directory, skipping deletion.');
        }

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
        const zipFileName = `${hashHex}-${target}.zip`;

        console.log(`Creating zip archive: ${zipFileName}`);
        const zip = new AdmZip();
        const distFiles = fs.readdirSync(distDir);
        for (const file of distFiles) {
            const filePath = path.join(distDir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                zip.addLocalFolder(filePath, file);
            } else if (!file.endsWith('.zip')) {
                zip.addLocalFile(filePath);
            }
        }

        const zipBuffer = zip.toBuffer();
        const localZipPath = path.join(exportDir, zipFileName);
        fs.writeFileSync(localZipPath, zipBuffer);

        const releaseDestPath = `releases/${zipFileName}`;
        const zipUrl = await uploadToFirebase(zipBuffer, releaseDestPath);

        versionObj.urls = {
            ...versionObj.urls,
            [target]: zipUrl,
        };

        versionObj.timestamp = new Date().toISOString();
        versionObj.status = 'completed';
        versionObj.description = commitMessage || `Deployment for version ${versionKey} (${target})`;

        console.log('Updating Firestore with new version info...');
        await db.collection('versions').doc(`${versionKey}`).set(versionObj, { merge: true });

        process.chdir(rootDir);
        console.log(`✅ Deployment completed successfully for ${target}.`);
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
})();