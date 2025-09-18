const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

// --- Token Generators ---
const generateAccessToken = (user) => {
  console.log("🔑 Generating access token for:", user.email);
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role }, // use email not username
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
};

const generateRefreshToken = (user) => {
  console.log("🔄 Generating refresh token for:", user.email);
  return jwt.sign({ id: user.id }, process.env.REFRESH_SECRET, {
    expiresIn: "7d",
  });
};

// --- Register ---
const register = async (req, res) => {
  try {
    console.log("📩 Register request body:", req.body);
    let { email, password, role } = req.body;
    role = role?.toLowerCase();
    const userRole =
      role && ["vendor", "admin"].includes(role) ? role : "vendor";

    // Check if email exists
    const exists = await pool.query(`SELECT id FROM users WHERE email=$1`, [
      email,
    ]);
    console.log("🔍 Email exists check:", exists.rows);

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const insertQ = `
      INSERT INTO users (email, password, role)
      VALUES ($1, $2, $3) RETURNING id, email, role
    `;
    const { rows } = await pool.query(insertQ, [
      email,
      hashedPassword,
      userRole,
    ]);
    const newUser = rows[0];
    console.log("✅ New user registered:", newUser);

    // Generate tokens
    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    // Store refresh token in DB
    await pool.query(`UPDATE users SET refresh_token=$1 WHERE id=$2`, [
      refreshToken,
      newUser.id,
    ]);
    console.log("💾 Refresh token saved for user:", newUser.id);

    res.status(201).json({
      message: "User registered",
      user: newUser,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("❌ Register error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// --- Login ---
const login = async (req, res) => {
  try {
    console.log("📩 Login request body:", req.body);
    const { email, password } = req.body;

    const q = `SELECT * FROM users WHERE email=$1`;
    const { rows } = await pool.query(q, [email]);
    console.log("🔍 DB user lookup result:", rows);

    if (rows.length === 0)
      return res.status(400).json({ error: "Invalid credentials" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    console.log("🔐 Password valid?", valid);

    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    let refreshToken = user.refresh_token;
    let refreshExpired = false;

    // Check if refresh token exists & valid
    if (refreshToken) {
      try {
        jwt.verify(refreshToken, process.env.REFRESH_SECRET);
        console.log("✅ Stored refresh token valid");
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          console.log("⚠️ Refresh token expired for user:", user.id);
          refreshExpired = true;
        } else {
          console.error("❌ Invalid stored refresh token:", err.message);
          return res.status(403).json({ error: "Invalid refresh token stored" });
        }
      }
    } else {
      console.log("ℹ️ No refresh token found in DB for user:", user.id);
      refreshExpired = true;
    }

    // If expired or missing → issue new refresh token
    if (refreshExpired) {
      refreshToken = generateRefreshToken(user);
      await pool.query(`UPDATE users SET refresh_token=$1 WHERE id=$2`, [
        refreshToken,
        user.id,
      ]);
      console.log("🔄 New refresh token issued for:", user.id);
    }

    // Always issue new access token
    const accessToken = generateAccessToken(user);

    console.log("✅ Login success for:", email);
    return res.json({
      accessToken,
      refreshToken, // include it always for consistency
      role: user.role,
      email: user.email,
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// --- Refresh ---
const refresh = async (req, res) => {
  try {
    console.log("📩 Refresh token request body:", req.body);
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ error: "Refresh token required" });

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    console.log("✅ Refresh token decoded:", decoded);

    const { rows } = await pool.query(`SELECT * FROM users WHERE id=$1`, [
      decoded.id,
    ]);
    console.log("🔍 User from DB for refresh:", rows);

    if (rows.length === 0)
      return res.status(403).json({ error: "User not found" });

    const user = rows[0];

    // Must match DB
    if (user.refresh_token !== refreshToken) {
      console.log("❌ Refresh token mismatch for user:", user.id);
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    // Issue new access token only
    const newAccessToken = generateAccessToken(user);
    console.log("✅ Issued new access token for:", user.email);

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      console.log("⚠️ Refresh token expired:", err.message);
      return res
        .status(403)
        .json({ error: "Refresh token expired. Please log in again." });
    }
    console.error("❌ Refresh error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { register, login, refresh };
