const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Authentication Middleware (Synchronous)
function authenticateTokenSync(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("🔐 [Auth] Incoming request:", {
    method: req.method,
    path: req.originalUrl,
    hasAuthHeader: !!authHeader,
    token: token ? token.substring(0, 15) + "..." : null,
  });

  // Check if a token was provided
  if (!token) {
    console.warn("⚠️ [Auth] No token provided");
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // Synchronous verification
    const user = jwt.verify(token, JWT_SECRET);
    console.log("✅ [Auth] Token verified:", user);
    req.user = user;
    next();
  } catch (err) {
    console.error("❌ [Auth] Token verification failed:", err.message);
    return res.status(403).json({ error: "Invalid or expired token." });
  }
}

// ✅ Authorization Middleware (remains the same)
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    console.log("🔑 [Role Check] Required:", allowedRoles, "User role:", req.user?.role);

    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.warn("🚫 [Role Check] Access denied for:", req.user?.role);
      return res.status(403).json({ error: "Forbidden. You do not have the required permissions." });
    }

    console.log("✅ [Role Check] Access granted to:", req.user.role);
    next();
  };
}

module.exports = { authenticateTokenSync, authorizeRoles };