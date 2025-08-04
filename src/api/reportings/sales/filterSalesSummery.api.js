const { HashSearch } = require("../../../utils/dbUtils");
const sanitizeHtml = require("sanitize-html");

module.exports = async (req, res) => {
    try {
        const {
            keywords = '',
            cashiers = [],
            year = '',
            month = '',
            week = '',
            day = '',
            hour = '',
            minute = '',
            second = '',
            millisecond = '',
            dataLimit = 1000
        } = req.body;

        if (typeof keywords !== 'string') {
            return res.status(400).json({ error: "Keywords must be a string" });
        }

        if (!Array.isArray(cashiers)) {
            return res.status(400).json({ error: "Cashiers must be an array" });
        }

        const sanitizedKeywords = sanitizeHtml(keywords.trim(), { allowedTags: [], allowedAttributes: {} });
        const sanitizedCashiers = cashiers
            .map(c => sanitizeHtml(String(c).trim(), { allowedTags: [], allowedAttributes: {} }))
            .filter(c => c);

        const validateNumber = (val, max, field) => {
            if (!val) return '';
            const num = Number(val);
            if (isNaN(num) || num < 0 || num > max) {
                throw new Error(`Invalid ${field} value`);
            }
            return num;
        };

        const validatedFields = {
            year: validateNumber(year, 9999, 'year'),
            month: validateNumber(month, 12, 'month'),
            week: validateNumber(week, 53, 'week'),
            day: validateNumber(day, 31, 'day'),
            hour: validateNumber(hour, 23, 'hour'),
            minute: validateNumber(minute, 59, 'minute'),
            second: validateNumber(second, 59, 'second'),
            millisecond: validateNumber(millisecond, 999, 'millisecond')
        };

        const searchLimit = Number(dataLimit) || 1000;

        if (isNaN(searchLimit) || searchLimit < 1) {
            throw new Error("Invalid data limit");
        }

        const pad = (val, length = 2) => String(val).padStart(length, '0');

        const timestampParts = Object.entries(validatedFields)
            .filter(([_, value]) => value !== '')
            .map(([key, value]) => {
                const prefix = key === 'year' ? 'y' : key === 'millisecond' ? 'ms' : key.slice(0, 1);
                const padLength = key === 'millisecond' ? 3 : 2;
                return `timestamp${prefix}${pad(value, padLength)}`;
            });

        let finalKeywords = sanitizedKeywords;
        if (timestampParts.length) {
            finalKeywords += (finalKeywords ? ' ' : '') + timestampParts.join(' ');
        }

        if (sanitizedCashiers.length) {
            const cashierParts = sanitizedCashiers.map(c => `usr&${c}`).join(' ');
            finalKeywords += (finalKeywords ? ' ' : '') + cashierParts;
        }

        if (!finalKeywords) {
            return res.status(400).json({ error: "No valid filters provided" });
        }

        const sales = await HashSearch(finalKeywords, 'sales', undefined, searchLimit);

        if (!Array.isArray(sales)) {
            throw new Error("Invalid search results format");
        }

        return res.status(200).json({
            success: true,
            data: sales,
            count: sales.length,
            limit: searchLimit
        });

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