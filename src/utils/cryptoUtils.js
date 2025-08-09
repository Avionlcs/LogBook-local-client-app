const crypto = require("crypto");

function generateSecretKey(baseSecretKey) {
    // baseSecretKey += Math.floor((10 * 60 * 60 * 1000)); 
    return crypto
        .createHash("sha256")
        .update(baseSecretKey)
        .digest("hex")
        .slice(0, 32);
}

function decrypt(encryptedText, secretKey) {
    try {
        secretKey = generateSecretKey("c3cff979def469cd7338eddC1847e940");
        const iv = Buffer.from(encryptedText.slice(0, 32), "hex");
        const encryptedTextWithoutIv = encryptedText.slice(32);
        const key = Buffer.alloc(32, secretKey);
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        let decrypted = decipher.update(encryptedTextWithoutIv, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    } catch (error) {
        //console.log("Error during decryption:", error);
        return false;
    }
}

function encrypt(text, secretKey) {
    secretKey = generateSecretKey("c3cff979def469cd7338eddC1847e940");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Buffer.from(secretKey),
        iv
    );
    let encrypted = cipher.update(text.toString(), "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + encrypted;
}

module.exports = { generateSecretKey, decrypt, encrypt };