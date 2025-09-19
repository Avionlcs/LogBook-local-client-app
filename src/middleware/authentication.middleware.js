const { get_cookie, create_cookie } = require("../routes/authRoutes");

const PUBLIC_AUTH_ROUTES = ['/signup', '/signin', '/api/verify-google-token'];

async function authenticationMiddleware(req, res, next) {
    try {
        if (PUBLIC_AUTH_ROUTES.includes(req.url)) {
            return next();
        }

        const authToken = req.cookies?.['auth_token'];
        if (!authToken) return next();

        const cookieData = await get_cookie(authToken);
        if (!cookieData || !cookieData.user) return next();

        req.user = cookieData.user;

        res.cookie('auth_token', cookieData.cookie, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 1000 * 60 * 60 * 24 * 365
        });

        next();
    } catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

const hasRequiredPermissions = (req, permissions) => {
    if (!req.user || !Array.isArray(req.user.roles)) return false;

    const requiredPermissions = permissions.split(",").map(permission => permission.trim());

    const userPermissions = req.user.roles
        .flatMap(role => Array.isArray(role.permissions) ? role.permissions : []);

    return requiredPermissions.every(permission => userPermissions.includes(permission));
};


const permissionMiddleware = (permissions) => {

    return (req, res, next) => {
        if (!req.user || !Array.isArray(req.user.roles)) {
            return res.status(403).json({ error: "Forbidden" });
        }

        const requiredPermissions = permissions.split(",").map(p => p.trim());
        const userPermissions = req.user.roles.flatMap(role =>
            Array.isArray(role.permissions) ? role.permissions : []
        );

        if (requiredPermissions.every(p => userPermissions.includes(p))) {
            next();
        } else {

            res.status(403).json({ 
                error: "Access Denied", 
                message: "🚫 Oops! You don't have the required permissions to access this resource. Please contact your administrator if you believe this is an error.",
                code: "INSUFFICIENT_PERMISSIONS"
            });
        }
    };
};


module.exports = {
    auth: authenticationMiddleware,
    authenticate: hasRequiredPermissions,
    permissionMiddleware
};
