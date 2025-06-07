const { decrypt } = require("../utils/cryptoUtils");
const db = require("../config/dbConfig");
const { addData, getData, HashSearch } = require("../utils/dbUtils");
const crypto = require("crypto");
const { authenticate } = require("./authentication.middleware");
const { log } = require("console");
const logsMiddleware = require("./logs.middleware");

const rechargeUrlPattern = /^\/recharge\/([A-Za-z0-9]+)$/;
const getCreditLogsUrlPattern = /^\/creditLogs$/;
const getBalanceUrlPattern = /^\/creditBalance$/;
const updateThemeUrlPattern = /^\/update\/theme\/1$/;

async function getCredits(req) {
    try {
        return parseFloat(await db.get(`credits:${req.user.id}`));
    } catch (error) {
        if (error.notFound) return 0;
        throw error;
    }
}

async function updateCredits(req, amount) {
    try {
        let currentCredits = await getCredits(req);
        let updatedCredits = parseFloat(currentCredits) + amount;
        await db.put(`credits:${req.user.id}`, updatedCredits);
        req.credits.spent += -1 * amount;

        return updatedCredits;
    } catch (error) {
        console.error("Error updating credits:", error);
        throw error;
    }
}

async function handleRecharge(req, res) {

    const match = req.url.match(rechargeUrlPattern);
    if (match && req.method === "GET") {
        const encrypted_code = match[1];
        const decryptedValue = decrypt(encrypted_code);
        const creditAmount = parseFloat(decryptedValue);
        console.log("Handling recharge request:", creditAmount);

        if (!isNaN(creditAmount)) {
            try {
                const usedKey = `used_code:${encrypted_code}`;
                const codeUsed = await db.get(usedKey).catch((error) => {
                    if (error.notFound) return false;
                    throw error;
                });
                if (codeUsed) {
                    return res.status(400).json({ error: "This code has already been used." });
                }
                // const updatedCredits = await updateCredits(req, -1 * creditAmount);
                let currentCredits = await getCredits(req);
                let updatedCredits = parseFloat(currentCredits) + creditAmount;
                await db.put(`credits:${req.user.id}`, updatedCredits);
                req.credits.recharged = creditAmount;
                req.credits.balance = currentCredits + creditAmount;
                req.credits.description = "Recharged credits via code";
                await db.put(usedKey, true);
                logsMiddleware(req, res, () => {
                    res.json(req.credits);
                });

            } catch (error) {
                return res.status(500).json({ error: "Internal Server Error" });
            }
        } else {
            return res.status(400).json({ error: "Invalid encrypted code." });
        }
    } else {
        return res.status(405).json({ error: "Method not allowed." });
    }
}

async function handleGetBalance(req, res) {
    return res.status(200).json({ balance: await getCredits(req) });
}

async function detectAmount(req, res, next) {
    var { method, body, url } = req;

    next();
}

async function handleUpdateTheme(req, res, next) {
    req.credits.description = "Theme update";
    await updateCredits(req, -5000);
    next();
}

async function handleDefault(req, res, next) {
    try {
        switch (req.method) {
            case "GET":
                req.credits.description = "API call";
                await updateCredits(req, -0.005);
                return next();
            case "POST":
                req.credits.description = "API POST call";
                await updateCredits(req, -0.02);
                break;
            case "PUT":
                req.credits.description = "API PUT call";
                await updateCredits(req, -0.01);
                break;
            case "DELETE":
                req.credits.description = "API DELETE call";
                await updateCredits(req, -0.05);
                break;
            default:
                req.credits.description = "Default API call";
                await updateCredits(req, -0.009);
                break;
        }
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
    if ((await getCredits(req)) > -100) next();
    else return res.status(401).json({ error: "No credits" });
}

async function handleGetCreditLogs(req, res) {

    const userPermissions = Array.isArray(req.user.roles)
        ? req.user.roles.flatMap(role => Array.isArray(role.permissions) ? role.permissions : [])
        : [];
    var keywords = [...[req.user.id], ...userPermissions];
    if (userPermissions.includes('superuser')) {
        keywords.push('superuser');
    }
    keywords.push("recharge");
    var creditLogs = [];

    for (let index = 0; index < keywords.length; index++) {
        const element = keywords[index] + ' recharged';

        const logs = await HashSearch(element, 'logs');
        creditLogs.push(...logs);
    }
    //   creditLogs = creditLogs.filter(log => log.credits.recharged);
    creditLogs = [...new Set(creditLogs.map(log => {
        const { permissions, ...rest } = log;
        return JSON.stringify(rest);
    }))].map(JSON.parse);
    creditLogs.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    return res.status(200).json({ creditLogs });

}

const creditMiddleware = async (req, res, next) => {
    req.user = req.user ? req.user : {};
    req.credits = { balance: await getCredits(req), spent: 0, description: "Credits for API usage" };

    let urlType = rechargeUrlPattern.test(req.url);
    if (rechargeUrlPattern.test(req.url)) urlType = 'recharge';
    else if (getBalanceUrlPattern.test(req.url)) urlType = 'balance';
    else if (updateThemeUrlPattern.test(req.url)) urlType = 'theme';
    else if (getCreditLogsUrlPattern.test(req.url)) urlType = 'creditLogs';
    else urlType = 'default';

    switch (urlType) {
        case 'recharge':
            await handleRecharge(req, res);
            break;
        case 'balance':
            await handleGetBalance(req, res);
            break;
        case 'theme':
            await handleUpdateTheme(req, res, next);
            break;
        case 'creditLogs':
            await handleGetCreditLogs(req, res);
            break;
        default:
            await handleDefault(req, res, next);
    }
};

module.exports = creditMiddleware;