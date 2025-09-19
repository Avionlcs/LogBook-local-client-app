module.exports = (item) => {
    if (typeof item !== 'object' || item === null) return '';

    const normalized = Object.keys(item)
        .sort()
        .map(key => `${key}:${(item[key] ?? '').toString().trim().toLowerCase()}`)
        .join('|');

    let hash = 0;
    for (let i = 0; i < normalized?.length; i++) {
        hash = (hash << 5) - hash + normalized.charCodeAt(i);
        hash |= 0; // Convert to 32-bit integer
    }

    return `h${Math.abs(hash)}`;
}
