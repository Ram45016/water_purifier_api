const jwt = require('jsonwebtoken');
const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET || 'youraccesstokensecret';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log("🔐 [Auth] Incoming request:", {
    method: req.method,
    path: req.originalUrl,
    hasAuthHeader: !!authHeader,
    token: token ? token.substring(0, 15) + "..." : null // mask token for safety
  });

  if (!token) {
    console.warn("⚠️ [Auth] No token provided");
    return res.sendStatus(401);
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      console.error("❌ [Auth] Token verification failed:", err.message);
      return res.sendStatus(403);
    }
    console.log("✅ [Auth] Token verified. User:", user);
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    console.log("🔑 [Role Check] Required roles:", allowedRoles, "User role:", req.user?.role);

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.warn("🚫 [Role Check] Access denied for user:", req.user);
      return res.sendStatus(403);
    }

    console.log("✅ [Role Check] Access granted to role:", req.user.role);
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
