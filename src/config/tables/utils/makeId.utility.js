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
    count = count > 0 ? count.toString("utf-8") : Math.floor(Math.random() * 999);
    count = Number(count) + 1;
    await db.put(`count:${entity}`, count.toString());
    return `${numberToBase36(count)}`;
};