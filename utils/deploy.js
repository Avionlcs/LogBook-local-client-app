const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const os = require('os');
const Client = require('ssh2-sftp-client');

const gitRepoPath = path.join(__dirname);
const remoteServer = 'ubuntu@47.129.58.48';
const projectName = 'Notebook';
const privateKeyPath = 'ses.pem' //path.join(process.env.HOME, '.ssh', 'ses.pem');
const localEnvFile = path.join(gitRepoPath, '.env');
const zipFilePath = path.join(gitRepoPath, `${projectName}.zip`);
const mainScript = 'index.js';

function executeCommand(command, cwd = gitRepoPath) {
    return new Promise((resolve, reject) => {
        console.log(`Executing: ${command}`);
        exec(command, { cwd, shell: true }, (error, stdout, stderr) => {
            if (error) {
                const errMsg = `Command failed: ${command}\nError: ${error.message}\nStderr: ${stderr}`;
                console.error(errMsg);
                return reject(new Error(errMsg));
            }
            console.log(`Output: ${stdout}`);
            resolve(stdout);
        });
    });
}

function createZipFile(gitRepoPath, projectName) {
    return new Promise((resolve, reject) => {
        console.log('Creating zip file...');
        const zip = new AdmZip();
        const zipFilePath = path.join(gitRepoPath, `${projectName}.zip`);

        // Define items to include
        const filesToInclude = ['package.json', 'index.js', 'data.sqlite'];
        const dirsToInclude = ['uploads', 'out', 'data'];

        try {
            // Add specific files to the root of the zip
            filesToInclude.forEach(file => {
                const fullPath = path.join(gitRepoPath, file);
                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                    zip.addLocalFile(fullPath, '');
                    console.log(`Added file: ${file}`);
                } else {
                    console.log(`File ${file} not found, skipping.`);
                }
            });

            // Add entire directories and their contents
            dirsToInclude.forEach(dir => {
                const fullPath = path.join(gitRepoPath, dir);
                if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
                    zip.addLocalFolder(fullPath, dir);
                    console.log(`Added directory: ${dir}`);
                } else {
                    console.log(`Directory ${dir} not found, skipping.`);
                }
            });

            // Write the zip file
            zip.writeZip(zipFilePath);
            console.log(`Zip file created: ${zipFilePath}`);
            resolve(`Zip file created: ${zipFilePath}`);
        } catch (error) {
            console.error(`Failed to create zip: ${error.message}`);
            reject(error);
        }
    });
}

async function uploadFile(zipFilePath, remoteServer, privateKeyPath, projectName) {
    const remotePath = `/home/ubuntu/${projectName}.zip`;
    const fileSize = fs.statSync(zipFilePath).size;
    const startTime = Date.now();
    const [username, host] = remoteServer.split('@');
    const sftp = new Client();

    try {
        await sftp.connect({
            host,
            username,
            privateKey: fs.readFileSync(privateKeyPath),
        });
        console.log('Starting upload...');
        await sftp.fastPut(zipFilePath, remotePath, {
            step: (totalTransferred, chunk, total) => {
                const percent = ((totalTransferred / total) * 100).toFixed(2);
                const elapsedTime = (Date.now() - startTime) / 1000;
                const speedKBs = (totalTransferred / elapsedTime / 1024).toFixed(2);
                process.stdout.write(`\rUploading: ${percent}% (${(totalTransferred / 1024 / 1024).toFixed(2)} MB / ${(total / 1024 / 1024).toFixed(2)} MB) at ${speedKBs} KB/s`);
            },
        });
        console.log('\nZip file uploaded successfully.');
    } catch (error) {
        console.error(`\nUpload failed: ${error.message}`);
        throw error;
    } finally {
        await sftp.end();
    }
}

function uploadEnvViaSSH(remoteServer, privateKeyPath, projectName) {
    return
    // return new Promise((resolve, reject) => {
    //     const remotePath = `/home/ubuntu/${projectName}/.env`;
    //     const command = `cat "${localEnvFile}" | ssh -i "${privateKeyPath}" ${remoteServer} "cat > ${remotePath}"`;
    //     console.log(`Uploading .env to: ${remotePath}`);
    //     exec(command, (error, stdout, stderr) => {
    //         if (error) {
    //             console.error(`Failed to upload .env: ${error.message}`);
    //             return reject(error);
    //         }
    //         console.log('.env uploaded successfully.');
    //         resolve();
    //     });
    // });
}

async function executeSSHCommands() {
    console.log('Connecting to server...');
    try {
        // Step 1: Upload the zip file
        await uploadFile(zipFilePath, remoteServer, privateKeyPath, projectName);

        // Step 2: Delete the existing project folder
        const deleteFolderCmd = `ssh -i "${privateKeyPath}" ${remoteServer} "if [ -d '/home/ubuntu/${projectName}' ]; then echo 'Removing old ${projectName} folder...'; sudo rm -rf /home/ubuntu/${projectName}; else echo 'No existing folder to delete.'; fi"`;
        await executeCommand(deleteFolderCmd);

        // Step 3: Install unzip if not present and unzip the file
        const unzipCmd = `ssh -i "${privateKeyPath}" ${remoteServer} "if ! command -v unzip &> /dev/null; then sudo apt update && sudo apt install -y unzip; fi; unzip -o /home/ubuntu/${projectName}.zip -d /home/ubuntu/${projectName}"`;
        await executeCommand(unzipCmd);

        // Step 4: Upload .env file (disabled by default)
        await uploadEnvViaSSH(remoteServer, privateKeyPath, projectName);

        // Step 5: Delete the uploaded zip file
        const deleteZipCmd = `ssh -i "${privateKeyPath}" ${remoteServer} "rm -f /home/ubuntu/${projectName}.zip"`;
        await executeCommand(deleteZipCmd);

        // Step 6: Install Node.js v18 if not present
        const installNodeCmd = `ssh -i "${privateKeyPath}" ${remoteServer} "if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q '^v18'; then curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs; fi"`;
        await executeCommand(installNodeCmd);

        // Step 7: Install PM2 globally if not present
        const installPm2Cmd = `ssh -i "${privateKeyPath}" ${remoteServer} "if ! command -v pm2 >/dev/null 2>&1; then sudo npm install -g pm2; fi"`;
        await executeCommand(installPm2Cmd);

        // Step 8: Install project dependencies
        const installDepsCmd = `ssh -i "${privateKeyPath}" ${remoteServer} "cd /home/ubuntu/${projectName} && npm i"`;
        await executeCommand(installDepsCmd);

        // Step 9: Restart or start the application with PM2
        const restartAppCmd = `ssh -i "${privateKeyPath}" ${remoteServer} "cd /home/ubuntu/${projectName} && sudo pm2 stop all && sudo pm2 start ${mainScript} --update-env"`;
        await executeCommand(restartAppCmd);

        console.log('SSH commands executed successfully.');
    } catch (error) {
        console.error(`SSH execution failed: ${error.message}`);
        throw error;
    }
}

async function main() {
    console.log('Starting deployment...');
    try {
        await executeCommand('cd frontend && ng build')
        await createZipFile(gitRepoPath, projectName).then(console.log).catch(console.error);
        await executeSSHCommands();
        const isWindows = os.platform() === 'win32';
        const cleanupCmd = isWindows ? `del /F estouQ "${zipFilePath}"` : `rm -f "${zipFilePath}"`;
        await executeCommand(cleanupCmd);
        console.log('Deployment completed successfully.');
    } catch (error) {
        console.error(`Deployment failed: ${error.message}`);
        process.exit(1);
    }
}

main();