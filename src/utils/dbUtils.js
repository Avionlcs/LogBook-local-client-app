const CryptoJS = require("crypto-js");
const db = require("../config/dbConfig");

const numberToBase36 = (number) => {
    const chars = "QHZ0WSX1C2DER4FV3BGTN7AYUJ8M96K5IOLP";
    number += 40;
    let base36 = "";
    while (number > 0) {
        let remainder = number % 36;
        base36 = chars[remainder] + base36;
        number = Math.floor(number / 36);
    }
    return base36 || "0";
};

const generateId = async (entity) => {
    let count = await db.get(`count:${entity}`);
    count = count > 0 ? count.toString("utf-8") : Math.floor(Math.random() * 101);
    count = Number(count) + 1;
    await db.put(`count:${entity}`, count.toString());
    return `${numberToBase36(count)}`;
};

const getHashData = async (hashedText) => {
    try {
        const buffer = await db.get("HashData:" + hashedText);
        if (buffer) {
            const data = buffer.toString("utf-8");
            const jsonData = JSON.parse(data);
            return jsonData;
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
};

const makeHash = async (keywords, elementKey, schema, id) => {
    const skipKeys = new Set(["permisions"]);
    if (!skipKeys.has(elementKey)) return;
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
        console.log("Error in makeHash:", error);
    }
};

const addAttributes = async (attributes, parentSchema, parentId) => {
    let addedAttributes = [];
    for (let index = 0; index < attributes.length; index++) {
        const attribute = attributes[index];
        const attributeName = Object.keys(attribute)[0];
        const attributeValue = Object.values(attribute)[0];
        const attributeData = {
            parentSchema,
            parentId,
            name: attributeName,
            indexInForm: index,
            ...getTypes(attributeValue),
        };
        try {
            const id = await generateId("Attribute");
            attributeData.id = id;
            await db.put("Attribute:" + id, attributeData);
            addedAttributes.push(attributeData);
        } catch (error) {
            console.error("Error adding attribute:", error);
        }
    }
    return addedAttributes;
};

const getTypes = (val) => {
    const typeObj = { valueType: typeof val };
    switch (typeObj.valueType) {
        case "string":
            typeObj.typeString = val;
            break;
        case "number":
            if (Number.isInteger(val)) {
                typeObj.typeInt = val;
            } else {
                typeObj.valueType = "double";
                typeObj.typeDouble = val;
            }
            break;
        case "boolean":
            typeObj.typeBool = val;
            break;
        case "object":
            typeObj.typeObject = JSON.stringify(val);
            break;
        default:
            return null;
    }
    return typeObj;
};

const getAttributesList = async (schema, data) => {
    const schemaList = await db.get("Schema:" + schema).catch(() => ({}));
    const schemaKeys = Object.keys(schemaList);
    const dataKeys = Object.keys(data);
    const commonKeys = dataKeys.filter((key) => schemaKeys.includes(key));
    const attributes = [];
    const dataObj = {};
    for (const key of dataKeys) {
        if (commonKeys.includes(key)) {
            dataObj[key] = data[key];
        } else {
            attributes.push({ [key]: data[key] });
        }
    }
    if (attributes.length > 0) {
        await addAttributes(attributes, schema, data.id);
    }
    return dataObj;
};

const addData = async (schema, data, useHash = false) => {
    if (!data?.id) data.id = await generateId(schema);
    data.id = data.id.toString();
    data.created = data.lastUpdated = new Date().toISOString();

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
        console.log(error);

        throw error;
    }
};

const parseExcelFile = (filePath) => {
    const workbook = require("xlsx").readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return require("xlsx").utils.sheet_to_json(sheet);
};

const addBulkData = async (schema, dataArray, useHash = false) => {
    const results = [];
    for (const data of dataArray) {
        if (!data?.id) data.id = await generateId(schema);
        data.id = data.id.toString();
        data.created = data.lastUpdated = new Date().toISOString();
        try {
            await db.put(schema + ":" + data.id, JSON.stringify(data));
            const dataObject = await db.get(schema + ":" + data.id);
            if (useHash) {
                for (const key of Object.keys(data)) {
                    await makeHash(data[key], key, schema, data.id);
                }
            }
            results.push(JSON.parse(dataObject.toString("utf-8")));
        } catch (error) {
            //console.log("Error adding data:", error);
            throw error;
        }
    }
    return results;
};

const removeDuplicates = (items) => {
    if (!items?.length) return [];
    const uniqueItems = [];
    const itemsSet = new Set();
    items.forEach((i) => {
        if (!itemsSet.has(i.id)) {
            itemsSet.add(i.id);
            uniqueItems.push(i);
        }
    });
    return uniqueItems;
};

const HashSearch = async (keyword, schema, filterBy, limit) => {
    if (!isNaN(keyword)) keyword = keyword.toString();
    keyword = keyword.toLowerCase();
    if (keyword.length < 1) return [];
    const textArray = keyword.split(" ");
    if (textArray.length > 1) {
        let data = await HashSearchUN(textArray[0].replace(/[,. ]/g, ""), schema, filterBy);
        const filteredResults = data.filter((p) =>
            textArray
                .slice(1)
                .every((element) => JSON.stringify(p).toLowerCase().includes(element.toLowerCase()))
        );
        return limit > 0 ? removeDuplicates(filteredResults)?.slice(0, limit) : removeDuplicates(filteredResults);
    } else {
        let results = await HashSearchUN(keyword.replace(/[,.]/g, ""), schema, filterBy);
        return limit > 0 ? removeDuplicates(results)?.slice(0, limit) : removeDuplicates(results);
    }
};

const HashSearchUN = async (keyword, schema, filterBy) => {
    keyword = keyword.toLowerCase();
    const hashText = CryptoJS.SHA256(keyword).toString();
    const hashData = await getHashData(hashText);
    if (!hashData || !hashData[keyword]) return [];
    const getOutDataWithSchema = async (schemaValue, schemaName) => {
        if (!schemaValue) return [];
        const getDataByIds = async (field) => {
            const o3 = [];
            if (schema) {
                try {
                    const d = await db.get(schema + ":" + keyword.toUpperCase());
                    if (d) o3.push(JSON.parse(d));
                } catch (error) { }
            }
            for (const item_id of field) {
                try {
                    const item = await db.get(schemaName + ":" + item_id);
                    if (item) o3.push(JSON.parse(item));
                } catch (error) { }
            }
            return o3;
        };
        if (filterBy) {
            if (!schemaValue[filterBy]) return [];
            return await getDataByIds(schemaValue[filterBy]);
        }
        let o5 = [];
        for (const field of Object.values(schemaValue)) {
            const items = await getDataByIds(field);
            o5.push(...items);
        }
        return o5;
    };
    if (!schema) {
        let o = [];
        for (const [schemaName, schemaValue] of Object.entries(hashData[keyword])) {
            const schemaResults = await getOutDataWithSchema(schemaValue, schemaName);
            o.push(...schemaResults);
        }
        return o;
    }
    return await getOutDataWithSchema(hashData[keyword][schema], schema);
};



const getData = async (schema, id) => {
    try {
        const data = await db.get(schema + ":" + id);
        if (data) {
            return JSON.parse(data.toString("utf-8"));
        }
        return null;
    } catch (error) {
        return null;
    }
};

const deleteData = async (schema, id) => {
    try {
        await db.del(schema + ":" + id);
        return true;
    } catch (error) {
        console.error("Error deleting data:", error);
        return false;
    }
};


module.exports = {
    generateId,
    makeHash,
    addAttributes,
    getTypes,
    getAttributesList,
    addData,
    parseExcelFile,
    addBulkData,
    removeDuplicates,
    HashSearch,
    HashSearchUN,
    getData,
    deleteData
};