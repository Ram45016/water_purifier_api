// Seed script - reads data/products.json and inserts into products table if not exists
require("dotenv").config();
const db = require("../db");
const fs = require("fs");

(async () => {
  try {
    // 1. Ensure table exists
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

    // 2. Load JSON data
    const raw = fs.readFileSync("./data/products.json", "utf8");
    const products = JSON.parse(raw);

    // 3. Insert products
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

    console.log("✅ Seed complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error", err);
    process.exit(1);
  }
})();
