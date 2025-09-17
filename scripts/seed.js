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
        brandName TEXT NOT NULL,
        buyingPrice INTEGER NOT NULL,
        sellingPrice INTEGER NOT NULL,
        vendorPrice INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        date DATE NOT NULL,
        images JSONB,
        isTopSelling BOOLEAN DEFAULT false,
        isFeatured BOOLEAN DEFAULT false,
        isBudgetFriendly BOOLEAN DEFAULT false,
        customFields JSONB
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
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
          (id, name, brandName, buyingPrice, sellingPrice, vendorPrice, quantity, date, images, isTopSelling, isFeatured, isBudgetFriendly, customFields)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO NOTHING
      `;

      const values = [
        p.id,
        p.name,
        p.brandName,
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

    // 3. Seed default users
    const defaultUsers = [
      { username: "admin", password: "admin123", role: "admin" },
      { username: "vendor1", password: "vendor123", role: "vendor" }
    ];

    for (const u of defaultUsers) {
      const exists = await db.query(`SELECT id FROM users WHERE username=$1`, [u.username]);
      if (exists.rows.length === 0) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        await db.query(
          `INSERT INTO users (username, password, role) VALUES ($1, $2, $3)`,
          [u.username, hashedPassword, u.role]
        );
        console.log(`Inserted user ${u.username} (${u.role})`);
      } else {
        console.log(`Skipped existing user ${u.username}`);
      }
    }

    console.log("✅ Users seed complete.");
    process.exit(0);

  } catch (err) {
    console.error("❌ Seed error", err);
    process.exit(1);
  }
})();
