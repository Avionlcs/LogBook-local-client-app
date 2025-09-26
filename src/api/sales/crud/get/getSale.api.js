const db = require("../../../../config/dbConfig");

const parseKeywordFilters = (keyword) => {
    const filters = {
        freeText: [],
        structured: {},
        idTokens: []
    };

    const tokens = keyword.trim().split(/\s+/);

    tokens.forEach(token => {
        if (token.includes('&')) {
            // Example: last_updated&y2025m4w1
            const [field, val] = token.split('&');
            if (field && val) {
                filters.structured[field] = val;
            }
        } else if (/^(total_paid|card_payment_amount|cash_payment_amount|qr_payment_amount)([><=])(\d+(\.\d+)?)$/.test(token)) {
            // Example: total_paid>1000
            const match = token.match(/^(total_paid|card_payment_amount|cash_payment_amount|qr_payment_amount)([><=])(\d+(\.\d+)?)$/);
            if (match) {
                const [, field, op, val] = match;
                filters.structured[field] = { op, val: parseFloat(val) };
            }
        } else if (/^\d+$/.test(token)) {
            // Pure numeric token treat as possible sale id or part of id
            filters.idTokens.push(token);
        } else {
            filters.freeText.push(token);
        }
    });

    filters.freeText = filters.freeText.join(' ').trim();
    return filters;
};

// Build WHERE clause based on filters
const buildWhereClause = (filters, values) => {
    const conditions = [];

    // Free text on seller_user_id, customer_user_id, status
    if (filters.freeText) {
        const ft = `%${filters.freeText.toLowerCase()}%`;
        conditions.push(
            `(LOWER(COALESCE(seller_user_id, '')) LIKE $${values?.length + 1} OR
        LOWER(COALESCE(customer_user_id, '')) LIKE $${values?.length + 1} OR
        LOWER(COALESCE(status, '')) LIKE $${values?.length + 1})`
        );
        values.push(ft);
    }

    // Structured filters (dates & amounts)
    for (const [field, val] of Object.entries(filters.structured)) {
        if (field === 'last_updated') {
            const yearMatch = val.match(/y(\d{4})/);
            const monthMatch = val.match(/m(\d{1,2})/);
            const weekMatch = val.match(/w(\d{1,2})/);

            if (yearMatch) {
                conditions.push(`EXTRACT(YEAR FROM updated_at) = $${values?.length + 1}`);
                values.push(parseInt(yearMatch[1], 10));
            }
            if (monthMatch) {
                conditions.push(`EXTRACT(MONTH FROM updated_at) = $${values?.length + 1}`);
                values.push(parseInt(monthMatch[1], 10));
            }
            if (weekMatch) {
                conditions.push(`EXTRACT(WEEK FROM updated_at) = $${values?.length + 1}`);
                values.push(parseInt(weekMatch[1], 10));
            }
        } else if (['total_paid', 'card_payment_amount', 'cash_payment_amount', 'qr_payment_amount'].includes(field)) {
            const op = val.op || '=';
            const valNum = val.val || 0;
            conditions.push(`${field} ${op} $${values?.length + 1}`);
            values.push(valNum);
        }
    }

    // IDs tokens matching exactly or partially on id::text
    if (filters.idTokens?.length > 0) {
        const idConds = filters.idTokens.map(token => {
            values.push(token);
            return `(CAST(id AS TEXT) = $${values?.length} OR CAST(id AS TEXT) LIKE $${values?.length})`;
        });
        conditions.push(`(${idConds.join(' OR ')})`);
        // Note: LIKE here is identical to = because same param, you can tweak if needed
    }

    if (conditions?.length === 0) return { clause: '', values };

    return {
        clause: 'WHERE ' + conditions.join(' AND '),
        values,
    };
};

// Calculate relevance score for sorting
const calculateRelevanceScore = (sale, filters) => {
    let score = 0;
    const idStr = sale.id.toString();

    // Score ID tokens: exact match highest, prefix next, substring next
    filters.idTokens.forEach(token => {
        if (idStr === token) score += 1000;
        else if (idStr.startsWith(token)) score += 500;
        else if (idStr.includes(token)) score += 100;
    });

    // Score freeText matches on seller_user_id, customer_user_id, status
    const ft = filters.freeText.toLowerCase();
    if (ft) {
        const seller = (sale.seller_user_id ?? '').toLowerCase();
        const customer = (sale.customer_user_id ?? '').toLowerCase();
        const status = (sale.status ?? '').toLowerCase();

        [seller, customer, status].forEach(fieldVal => {
            if (fieldVal === ft) score += 300;
            else if (fieldVal.startsWith(ft)) score += 150;
            else if (fieldVal.includes(ft)) score += 50;
        });
    }

    // Score structured numeric filters: closer to filter val better
    ['total_paid', 'card_payment_amount', 'cash_payment_amount', 'qr_payment_amount'].forEach(field => {
        if (filters.structured[field]) {
            const filterVal = filters.structured[field].val;
            const val = parseFloat(sale[field]) || 0;
            const diff = Math.abs(val - filterVal);
            // Smaller difference = higher score; max 200 points scaled inversely with diff
            score += Math.max(0, 200 - diff);
        }
    });

    // Score last_updated filters by closeness of date (days difference)
    if (filters.structured.last_updated) {
        const now = new Date();
        const updatedAt = new Date(sale.updated_at);
        const diffDays = Math.abs((now - updatedAt) / (1000 * 60 * 60 * 24));
        score += Math.max(0, 100 - diffDays);
    }

    return score;
};

module.exports = async (req, res) => {
    const pool = db.getPool();

    try {
        const keyword = req.query.keyword || '';
        const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);

        const filters = parseKeywordFilters(keyword);

        const { clause, values } = buildWhereClause(filters, []);

        const query = `
      SELECT * FROM sales
      ${clause}
      ORDER BY updated_at DESC, created_at DESC
      LIMIT $${values?.length + 1}
    `;

        values.push(limit);

        const { rows: sales } = await pool.query(query, values);

        // Sort by relevance score computed on results (descending)
        sales.sort((a, b) => calculateRelevanceScore(b, filters) - calculateRelevanceScore(a, filters));

        res.json({ success: true, sales });
    } catch (error) {
        console.error('Sales search error:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
