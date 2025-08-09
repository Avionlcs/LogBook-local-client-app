const db = require("../../../config/dbConfig");
const { HashSearch, getData, generateId } = require("../../../utils/dbUtils");
const sanitizeHtml = require("sanitize-html");



function convertDateToCFSLabels(dateInput, elementKey) {
    const dateObj = new Date(dateInput);
    if (isNaN(dateObj)) return [];

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hour = String(dateObj.getHours()).padStart(2, '0');
    const minute = String(dateObj.getMinutes()).padStart(2, '0');
    const second = String(dateObj.getSeconds()).padStart(2, '0');
    const millisecond = String(dateObj.getMilliseconds()).padStart(3, '0');
    const weekOfMonth = Math.ceil(parseInt(day, 10) / 7);

    return `${elementKey}y${year} ${elementKey}m${month} ${elementKey}w${weekOfMonth} ${elementKey}d${day} ${elementKey}h${hour} ${elementKey}mm${minute} ${elementKey}ss${second} ${elementKey}ms${millisecond}`;
}

const makeHash = async (keywords, elementKey, schema, id) => {
    const skipKeys = new Set(["timestamp", "user"]);
    if (!skipKeys.has(elementKey)) return;
    if (typeof keywords == "object") {
        return;
    }
    keywords = keywords?.toString().trim();
    if (['timestamp'].includes(elementKey)) {
        const tokens = convertDateToCFSLabels(keywords, elementKey);
        keywords = tokens;
        //console.log("Converted date to CFS labels:", tokens);
    }

    if (elementKey == 'user') {
        keywords = 'usr&' + keywords;
    }

    try {
        if (!keywords) return;
        const words = keywords
            .toString()
            .toLowerCase()
            .split(" ")
            .filter((word) => word && word.trim() !== "");
        for (const word of words) {
            for (let i = 0; i < word.length; i++) {
                for (let j = i + 1; j <= word.length; j++) {
                    var substring = word.slice(i, j).replace(/[,.]/g, "");

                    if (!isNaN(parseFloat(word))) {
                        substring = word;
                        i = word.length + 1;
                    }
                    if (substring.length >= 2) {
                        const hashedText = CryptoJS.SHA256(substring).toString();
                        let data = await getHashData(hashedText);
                        if (data) {
                            if (!data[substring]) data[substring] = {};
                            if (!data[substring][schema]) data[substring][schema] = {};
                            if (!data[substring][schema][elementKey])
                                data[substring][schema][elementKey] = [];
                            if (!data[substring][schema][elementKey].includes(id)) {
                                data[substring][schema][elementKey].push(id);
                            }
                            await db.put("HashData:" + hashedText, JSON.stringify(data));
                        } else {
                            const newData = {
                                [substring]: { [schema]: { [elementKey]: [id] } },
                            };
                            await db.put("HashData:" + hashedText, JSON.stringify(newData));
                        }
                    }
                }
            }
        }
    } catch (error) {
        //console.log("Error in makeHash:", error);
    }
};

const addData = async (schema, data, useHash = false) => {
    if (!data?.id) data.id = await generateId(schema);
    data.id = data.id.toString();
    const localDate = new Date();
    const datePart = localDate.toLocaleDateString('en-US');
    const timePart = localDate.toLocaleTimeString('en-US', { hour12: false });
    data.created = data.last_updated = `${datePart} ${timePart}`;

    try {
        await db.put(schema + ":" + data.id, JSON.stringify(data));
        const dataObject = await db.get(schema + ":" + data.id);
        if (useHash) {
            for (const key of Object.keys(data)) {
                await makeHash(data[key], key, schema, data.id);
            }
        }
        if (dataObject == null) {
            return null;
        }
        return JSON.parse(dataObject.toString("utf-8"));
    } catch (error) {
        //console.log(error);
        throw error;
    }
};

module.exports = async (req, res) => {
    //console.log('req ', req.body);

    try {
        const {
            itemID, itemQty
        } = req.body;

        let item = await getData('sale', itemID);
        let updatedQty = item.stock - itemQty;
        if (updatedQty < item.minStock) {
            res.403.not enogh items in stock
        }
        let sale = {
            items: [{ item.id, qty: itemQty, total: item.salePrice * itemQty }],
            totalPaid: 0,
            cardPayment: 0,
            cashPayment: 0,
            total: items.map(() => {
                total
            }),
            state: 'initiated'
        }
        let
    } catch (error) {
        console.error("Sales search error:", {
            message: error.message,
            stack: error.stack,
            requestBody: req.body
        });

        return res.status(400).json({
            success: false,
            error: error.message
        });
    }
};