require("dotenv").config();
const db = require("../db");
const fs = require("fs");
const bcrypt = require("bcryptjs");

(async () => {
  try {
    // 1. Ensure tables exist
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        brand_name TEXT NOT NULL,
        buying_price INTEGER NOT NULL,
        selling_price INTEGER NOT NULL,
        vendor_price INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        date DATE NOT NULL,
        images JSONB,
        is_top_selling BOOLEAN DEFAULT false,
        is_featured BOOLEAN DEFAULT false,
        is_budget_friendly BOOLEAN DEFAULT false,
        custom_fields JSONB
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'vendor',
        refresh_token TEXT
      );
    `);

    // 2. Seed products
    const raw = fs.readFileSync("./data/products.json", "utf8");
    const products = JSON.parse(raw);

    for (const p of products) {
      const q = `
        INSERT INTO products
          (id, name, brand_name, buying_price, selling_price, vendor_price, quantity, date, images, is_top_selling, is_featured, is_budget_friendly, custom_fields)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO NOTHING
      `;

      const values = [
        p.id,
        p.name,
        p.brandName, // still camelCase from JSON
        p.buyingPrice,
        p.sellingPrice,
        p.vendorPrice,
        p.quantity,
        p.date,
        JSON.stringify(p.images || []),
        p.isTopSelling || false,
        p.isFeatured || false,
        p.isBudgetFriendly || false,
        JSON.stringify(p.customFields || []),
      ];

      await db.query(q, values);
      console.log(`Inserted/Skipped product ${p.id} - ${p.name}`);
    }

    console.log("✅ Products seed complete.");

    // 3. Seed default users (email only)
    const defaultUsers = [
      { email: "admin@example.com", password: "admin123", role: "admin" },
      { email: "vendor1@example.com", password: "vendor123", role: "vendor" }
    ];

    for (const u of defaultUsers) {
      const exists = await db.query(`SELECT id FROM users WHERE email=$1`, [u.email]);
      if (exists.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await db.query(
          `INSERT INTO users (email, password, role) VALUES ($1, $2, $3)`,
          [u.email, hashedPassword, u.role]
        );
        console.log(`Inserted user ${u.email} (${u.role})`);
      } else {
        console.log(`Skipped existing user ${u.email}`);
      }
    }

    console.log("✅ Users seed complete.");
    process.exit(0);

  } catch (err) {
    console.error("❌ Seed error", err);
    process.exit(1);
  }
})();
