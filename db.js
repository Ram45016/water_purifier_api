// db.js - simple pg pool wrapper
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If your Neon requires SSL and NODE rejects unauthorized, you can set ssl: { rejectUnauthorized: false }
  ssl: { rejectUnauthorized: false }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
