const { addData } = require("../utils/dbUtils");

const logsMiddleware = async (req, res, next) => {

    // let log = await addData('logs', req)
    //    console.log('Headers:----------- ', Object.keys(req));
    // console.log('Request URL:', req.credits);

    let logPayload = {
        aborted: req.aborted,
        upgrade: req.upgrade,
        url: req.url,
        method: req.method,
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        baseUrl: req.baseUrl,
        params: req.params,
        query: req.query,
        body: req.body,
        secret: req.secret,
        user: req.user.id || 'anonymous',
        permissions: `superuser admin accountant credit_manager manage_credits ${req.credits.recharged ? 'recharge' : 'spent'}`,
        credits: req.credits
    };

    function removeEmptyValues(obj) {
        if (Array.isArray(obj)) {
            return obj
                .map(removeEmptyValues)
                .filter(
                    (v) =>
                        v !== undefined &&
                        v !== null &&
                        v !== '' &&
                        v !== false &&
                        v !== 0 &&
                        (typeof v !== 'object' || (Array.isArray(v) ? v.length : Object.keys(v).length))
                );
        } else if (typeof obj === 'object' && obj !== null) {
            return Object.entries(obj).reduce((acc, [key, value]) => {
                const cleaned = removeEmptyValues(value);
                if (
                    cleaned !== undefined &&
                    cleaned !== null &&
                    cleaned !== '' &&
                    cleaned !== false &&
                    cleaned !== 0 &&
                    (typeof cleaned !== 'object' || (Array.isArray(cleaned) ? cleaned.length : Object.keys(cleaned).length))
                ) {
                    acc[key] = cleaned;
                }
                return acc;
            }, {});
        }
        return obj;
    }

    logPayload = removeEmptyValues(logPayload);
    let log = await addData('logs', logPayload, true);
    // console.log('-------------99999999999999999999999999999999999999999999999999 ', log);

    // if (req.body) {
    //     console.log('Body:', req.body);
    // }

    next();
};

module.exports = logsMiddleware;