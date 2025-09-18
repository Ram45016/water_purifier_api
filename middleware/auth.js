const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;

// ✅ Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("🔐 [Auth] Incoming request:", {
    method: req.method,
    path: req.originalUrl,
    hasAuthHeader: !!authHeader,
    token: token ? token.substring(0, 15) + "..." : null,
    ACCESS_TOKEN_SECRET: ACCESS_TOKEN_SECRET,
  });

  if (!token) {
    console.warn("⚠️ [Auth] No token provided");
    return res.sendStatus(401);
  }

  jwt.verify(token, ACCESS_TOKEN_SECRET, { algorithms: ["HS256"] }, (err, user) => {
    if (err) {
      console.error("❌ [Auth] Token verification failed:", err.message);
      return res.sendStatus(403);
    }
    console.log("✅ [Auth] Token verified:", user);
    req.user = user;
    next();
  });
}

// ✅ Authorization Middleware
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    console.log("🔑 [Role Check] Required:", allowedRoles, "User role:", req.user?.role);

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.warn("🚫 [Role Check] Access denied for:", req.user);
      return res.sendStatus(403);
    }

    console.log("✅ [Role Check] Access granted to:", req.user.role);
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };
