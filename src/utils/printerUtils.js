const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");


function getPrinters() {
    return new Promise((resolve, reject) => {
        // Use PowerShell to get printer names
        exec(
            'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"',
            { windowsHide: true },
            (error, stdout, stderr) => {
                if (error) return reject(error);

                // Split lines, trim whitespace, remove empty entries
                const printers = stdout
                    .split(/\r?\n/)
                    .map(name => name.trim())
                    .filter(name => name?.length > 0);

                resolve(printers);
            }
        );
    });
}


const getCleanPrinterNames = (printers) => {
    return printers
        .map((printer) => printer.trim().replace(/\r/g, "").replace(/\s+/g, " "))
        .slice(1);
};

function getChromePath() {
    let chromePath = null;
    chromePath = queryRegistry(
        "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe"
    );
    if (chromePath && fs.existsSync(chromePath)) return chromePath;
    chromePath = queryRegistry(
        "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe"
    );
    if (chromePath && fs.existsSync(chromePath)) return chromePath;
    const possiblePaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe"),
        path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe"),
        path.join(process.env["PROGRAMFILES(X86)"], "Google\\Chrome\\Application\\chrome.exe"),
    ];
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) return p;
    }
    console.error("Google Chrome executable not found.");
    return null;
}

function queryRegistry(registryKey) {
    try {
        const result = require("child_process").execSync(`reg query "${registryKey}" /ve`, { encoding: "utf-8" });
        const match = result.match(/(?:\s+)?\(Default\)\s+REG_SZ\s+(.*)/i);
        if (match && match[1]) {
            const chromePath = match[1].trim();
            return chromePath.replace(/%([^%]+)%/g, (_, key) => process.env[key]);
        }
        return null;
    } catch (error) {
        return null;
    }
}

module.exports = { getPrinters, getCleanPrinterNames, getChromePath, queryRegistry };