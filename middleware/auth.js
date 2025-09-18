const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Authentication Middleware
function authenticateToken(req, res, next) {
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
    // 401 Unauthorized: The request requires user authentication.
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  // Verify the token using the secret key
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("❌ [Auth] Token verification failed:", err.message);
      // 403 Forbidden: The server understood the request but refuses to authorize it.
      return res.status(403).json({ error: "Invalid or expired token." });
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

    // Check if the user's role is in the list of allowed roles
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.warn("🚫 [Role Check] Access denied for:", req.user?.role);
      // 403 Forbidden: The user does not have the necessary permissions.
      return res.status(403).json({ error: "Forbidden. You do not have the required permissions." });
    }

    console.log("✅ [Role Check] Access granted to:", req.user.role);
    next();
  };
}

module.exports = { authenticateToken, authorizeRoles };