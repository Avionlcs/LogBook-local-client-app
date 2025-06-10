#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const AdmZip = require('adm-zip');
const admin = require('firebase-admin');
const crypto = require('crypto');

const ROOT_DIR = process.cwd();
const EXPORT_DIR = path.join(ROOT_DIR, 'export');
const DIST_DIR = path.join(EXPORT_DIR, 'dist');
const FIREBASE_STORAGE_BUCKET = 'gs://logbook-440cb.firebasestorage.app';
const SERVICE_ACCOUNT = require('./serviceAccount.json');

console.log('Initializing Firebase...');
admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT),
    storageBucket: FIREBASE_STORAGE_BUCKET
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function uploadToFirebase(buffer, destinationPath) {
    try {
        console.log(`Uploading ${destinationPath} to Firebase Storage...`);
        const file = bucket.file(destinationPath);
        await file.save(buffer, { contentType: 'application/zip' });
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });
        console.log(`Upload complete. File URL: ${url}`);
        return url;
    } catch (error) {
        console.error(`Failed to upload ${destinationPath} to Firebase:`, error);
        throw error;
    }
}

function getGitBranch() {
    try {
        console.log('Getting current git branch...');
        return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
        console.error('Failed to get git branch:', error);
        throw new Error('Git branch retrieval failed');
    }
}

function cleanVersion(version) {
    return version.trim().replace(/[^a-zA-Z0-9.-]/g, '_');
}

function getCommitMessage() {
    try {
        console.log('Getting latest git commit message...');
        let message = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
        message = message.replace(/\|[^|]+\|/g, '').trim();
        const prefixMatch = message.match(/^([^:]+:)\s*(.*)$/);
        return prefixMatch ? prefixMatch[2].trim() : message;
    } catch (error) {
        console.warn('Failed to get commit message:', error);
        return '';
    }
}

function installDependencies() {
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
}

function buildProject() {
    console.log('Running ncc build...');
    execSync(`npx ncc build app.js -o ${DIST_DIR} --no-cache`, { stdio: 'inherit' });
}

function copyOutDirectory() {
    const source = path.join(ROOT_DIR, 'out');
    const destination = path.join(DIST_DIR, 'out');
    if (fs.existsSync(source)) {
        console.log(`Copying out directory from ${source} to ${destination}`);
        fs.copySync(source, destination);
    }
}

function rebuildNativeModules() {
    if (process.env.TARGET_OS === 'node16-win-x64') {
        console.log('Rebuilding native modules for Windows...');
        execSync('npm rebuild --arch=x64 --platform=win32', {
            cwd: DIST_DIR,
            stdio: 'inherit'
        });
    }
}

function packageProject(target) {
    console.log('Packaging with pkg...');
    execSync(`npx pkg index.js --targets ${target}`, {
        cwd: DIST_DIR,
        stdio: 'inherit'
    });
}

function cleanDistDirectory() {
    const indexPath = path.join(DIST_DIR, 'index.js');
    if (fs.existsSync(indexPath)) {
        console.log('Removing index.js from dist directory...');
        fs.unlinkSync(indexPath);
    }
}

function calculateDistHash() {
    console.log('Calculating hash for dist files...');
    const files = fs.readdirSync(DIST_DIR)
        .filter(file => !file.endsWith('.zip'))
        .map(file => path.join(DIST_DIR, file));

    const hash = crypto.createHash('sha256');
    files.forEach(filePath => {
        if (fs.statSync(filePath).isFile()) {
            hash.update(fs.readFileSync(filePath));
        }
    });
    return hash.digest('hex');
}

function createZipArchive(zipFileName) {
    console.log(`Creating zip archive: ${zipFileName}`);
    const zip = new AdmZip();
    fs.readdirSync(DIST_DIR).forEach(file => {
        const filePath = path.join(DIST_DIR, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            zip.addLocalFolder(filePath, file);
        } else if (!file.endsWith('.zip')) {
            zip.addLocalFile(filePath);
        }
    });
    return zip.toBuffer();
}

async function updateFirestore(versionKey, target, zipUrl, commitMessage) {
    const versionDocRef = db.collection('versions').doc(versionKey);
    const versionDoc = await versionDocRef.get();

    let versionData = {
        key: versionKey,
        status: 'building',
        timestamp: new Date().toISOString(),
        urls: {}
    };

    if (versionDoc.exists) {
        versionData = { ...versionData, ...versionDoc.data() };
    }

    const platformKey = `${target.split('-')[1]}-${target.split('-')[2]}`;
    const currentVersion = (versionData.urls[platformKey]?.version || 0) + 1;

    if (versionData.urls[platformKey]?.url && versionData.urls[platformKey]?.url !== zipUrl) {
        const oldUrl = versionData.urls[platformKey].url;
        const match = oldUrl.match(/releases\/([a-zA-Z0-9\-]+\.zip)/);
        if (match && match[1]) {
            const oldZipPath = `releases/${match[1]}`;
            try {
                console.log(`Deleting old zip file from Firebase Storage: ${oldZipPath}`);
                await bucket.file(oldZipPath).delete();
            } catch (err) {
                console.warn(`Failed to delete old zip file: ${oldZipPath}`, err.message);
            }
        }
    }
    versionData.urls[platformKey] = {
        version: currentVersion,
        url: zipUrl
    };
    versionData.status = 'completed';
    versionData.timestamp = new Date().toISOString();
    versionData.description = commitMessage || `Deployment for ${versionKey} (${target})`;

    console.log('Updating Firestore with version info...');
    await versionDocRef.set(versionData, { merge: true });
}

(async () => {
    try {
        const version = getGitBranch();
        if (!version) throw new Error('No git branch found');

        const cleanedVersion = cleanVersion(version);
        const target = process.env.TARGET_OS || 'node16-linux-x64';
        const commitMessage = getCommitMessage();

        fs.removeSync(EXPORT_DIR);
        fs.ensureDirSync(DIST_DIR);

        installDependencies();
        buildProject();
        copyOutDirectory();
        rebuildNativeModules();
        packageProject(target);
        cleanDistDirectory();

        const hash = calculateDistHash();
        const zipFileName = `${hash}-${target}.zip`;
        const zipBuffer = createZipArchive(zipFileName);

        fs.writeFileSync(path.join(EXPORT_DIR, zipFileName), zipBuffer);
        const zipUrl = await uploadToFirebase(zipBuffer, `releases/${zipFileName}`);

        await updateFirestore(cleanedVersion, target, zipUrl, commitMessage);

        console.log(`✅ Deployment completed successfully for ${target}`);
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
})();