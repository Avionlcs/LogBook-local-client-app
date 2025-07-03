const CryptoJS = require("crypto-js");
const db = require("../config/dbConfig");

const encrypt = (text, secret) => {
    const ciphertext = CryptoJS.AES.encrypt(text, CryptoJS.SHA256(secret).toString()).toString();
    return ciphertext;
};

const decrypt = (ciphertext, secret) => {
    const bytes = CryptoJS.AES.decrypt(ciphertext, CryptoJS.SHA256(secret).toString());
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
};


const hash = (text) => {
    return CryptoJS.SHA256(text).toString();
};

const storeDB = async (key, value) => {
    key = hash(key, hash(key + '9d6c194a-db67-44f0-8c88-2b579312fa57'));
    value = encrypt(typeof value != 'string' ? JSON.stringify(value) : value, hash(key + '2e067395-3968-495e-b3c9-c98a150147da'));

    let yy = await db.put(key, value);
    console.log('++++ ', yy);

    return { key, value }
}




const retriveDB = async (key) => {
    key = hash(key, hash(key + '9d6c194a-db67-44f0-8c88-2b579312fa57'));

    console.log("||| ", value);
    var value = await db.get(key);

    value = value.toString("utf-8");
    //console.log('++++ ---', value);
    value = decrypt(value, hash(key + '2e067395-3968-495e-b3c9-c98a150147da'));
    if (value) {
        value = JSON.parse(value);
    }


    //console.log('?????? ', value);

    return value;
}

const test = async () => {
    let enc = await storeDB('kat:2S', { ba: 'ss' });
    let dec = await retriveDB('kat:2S');
    console.log('enc', enc);
    console.log('dec', dec);
}

//test()

