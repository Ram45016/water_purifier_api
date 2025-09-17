const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

// Generate tokens
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "15m" } // short-lived
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.REFRESH_SECRET,
    { expiresIn: "7d" } // long-lived
  );
};

// Register
const register = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const userRole = role && ["vendor", "admin"].includes(role) ? role : "vendor";

    // check if username already exists
    const exists = await pool.query(`SELECT id FROM users WHERE username=$1`, [username]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user first (so we get the ID)
    const insertQ = `
      INSERT INTO users (username, password, role)
      VALUES ($1, $2, $3) RETURNING id, username, role
    `;
    const { rows } = await pool.query(insertQ, [username, hashedPassword, userRole]);
    const newUser = rows[0];

    // Generate refresh token with the correct id
    const refreshToken = generateRefreshToken(newUser);

    // Store refresh token
    await pool.query(`UPDATE users SET refresh_token=$1 WHERE id=$2`, [refreshToken, newUser.id]);

    res.status(201).json({
      message: "User registered",
      user: newUser,
      refreshToken,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const q = `SELECT * FROM users WHERE username=$1`;
    const { rows } = await pool.query(q, [username]);

    if (rows.length === 0) return res.status(400).json({ error: "Invalid credentials" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // store new refreshToken in DB
    await pool.query(`UPDATE users SET refresh_token=$1 WHERE id=$2`, [refreshToken, user.id]);

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
};

// Refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken, username, password } = req.body;

    if (!refreshToken) return res.status(401).json({ error: "Refresh token required" });

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
      const { rows } = await pool.query(`SELECT * FROM users WHERE id=$1`, [decoded.id]);

      if (rows.length === 0) return res.status(403).json({ error: "User not found" });
      const user = rows[0];

      if (user.refresh_token !== refreshToken) {
        return res.status(403).json({ error: "Invalid refresh token" });
      }

      const newAccessToken = generateAccessToken(user);
      return res.json({ accessToken: newAccessToken });
    } catch (err) {
      // Refresh token expired → fallback to password check
      if (err.name === "TokenExpiredError") {
        if (!username || !password) {
          return res.status(403).json({ error: "Refresh expired. Provide username & password" });
        }

        const { rows } = await pool.query(`SELECT * FROM users WHERE username=$1`, [username]);
        if (rows.length === 0) return res.status(400).json({ error: "Invalid credentials" });

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: "Invalid credentials" });

        // regenerate tokens
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        await pool.query(`UPDATE users SET refresh_token=$1 WHERE id=$2`, [newRefreshToken, user.id]);

        return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
      }

      return res.status(403).json({ error: "Invalid refresh token" });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = { register, login, refresh };
