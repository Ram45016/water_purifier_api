const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// Setup multer for blob storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// --- GET all products ---
router.get('/', async (req, res) => {
  console.log("➡️ GET /api/products");
  try {
    const result = await db.query('SELECT * FROM products ORDER BY name');
    console.log("✅ Products fetched:", result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// --- GET product by ID ---
router.get('/:id', async (req, res) => {
  console.log(`➡️ GET /api/products/${req.params.id}`);
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!result.rows.length) {
      console.warn(`⚠️ Product not found: ID=${req.params.id}`);
      return res.status(404).json({ error: 'Product not found' });
    }
    console.log("✅ Product fetched:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching product:", err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// --- CREATE product ---
router.post('/', authenticateToken, authorizeRoles('admin'), upload.array('images'), async (req, res) => {
  console.log("➡️ POST /api/products");
  try {
    const p = req.body;
    console.log("📝 Request body:", p);
    console.log("📸 Uploaded files:", req.files?.length || 0);

    // Handle customFields safely
    let customFields = [];
    if (typeof p.customFields === "string") {
      try {
        customFields = JSON.parse(p.customFields);
      } catch {
        customFields = [];
      }
    } else if (p.customFields) {
      customFields = p.customFields;
    }

    // Handle images
    let images = [];
    if (req.files && req.files.length) {
      images = req.files.map(file => file.buffer.toString('base64'));
    }

    const q = `
      INSERT INTO products
        (id, name, "brand_name", "buying_price", "selling_price", "vendor_price",
        quantity, date, images, "is_top_selling", "is_featured", "is_budget_friendly", "custom_fields")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `;

    const values = [
      p.id,
      p.name,
      p.brand_name,
      p.buying_price,
      p.selling_price,
      p.vendor_price,
      p.quantity,
      p.date,
      JSON.stringify(images),  // array of base64 strings
      p.is_top_selling === "true" || p.is_top_selling === true,
      p.is_featured === "true" || p.is_featured === true,
      p.is_budget_friendly === "true" || p.is_budget_friendly === true,
      JSON.stringify(custom_fields)
    ];

    console.log("📥 Insert query values:", values);
    const result = await db.query(q, values);
    console.log("✅ Product created:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error creating product:", err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// --- UPDATE product ---
router.put('/:id', authenticateToken, authorizeRoles('admin'), upload.array('images'), async (req, res) => {
  console.log(`➡️ PUT /api/products/${req.params.id}`);
  try {
    const p = req.body;
    console.log("📝 Request body:", p);
    console.log("📸 Uploaded files:", req.files?.length || 0);

    let existing = await db.query('SELECT images FROM products WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) {
      console.warn(`⚠️ Product not found: ID=${req.params.id}`);
      return res.status(404).json({ error: 'Product not found' });
    }
    existing = existing.rows[0].images || [];
    console.log("📂 Existing images count:", existing.length);

    let uploadedImages = [];
    if (req.files && req.files.length) {
      uploadedImages = req.files.map(f => f.buffer.toString('base64'));
    }
    const images = JSON.stringify([...existing, ...uploadedImages]);

    // Handle customFields
    let customFields = [];
    if (typeof p.customFields === "string") {
      try {
        customFields = JSON.parse(p.customFields);
      } catch {
        customFields = [];
      }
    } else if (p.customFields) {
      customFields = p.customFields;
    }

    const q = `
      UPDATE products SET
        name=$1, "brandName"=$2, "buyingPrice"=$3, "sellingPrice"=$4, "vendorPrice"=$5,
        quantity=$6, date=$7, images=$8, "isTopSelling"=$9, "isFeatured"=$10, "isBudgetFriendly"=$11, "customFields"=$12
      WHERE id=$13 RETURNING *
    `;

    const values = [
      p.name,
      p.brandName,
      p.buyingPrice,
      p.sellingPrice,
      p.vendorPrice,
      p.quantity,
      p.date,
      images,
      p.isTopSelling === "true" || p.isTopSelling === true,
      p.isFeatured === "true" || p.isFeatured === true,
      p.isBudgetFriendly === "true" || p.isBudgetFriendly === true,
      JSON.stringify(customFields),
      req.params.id
    ];

    console.log("📥 Update query values:", values);
    const result = await db.query(q, values);
    console.log("✅ Product updated:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating product:", err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// --- DELETE product ---
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  console.log(`➡️ DELETE /api/products/${req.params.id}`);
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) {
      console.warn(`⚠️ Product not found: ID=${req.params.id}`);
      return res.status(404).json({ error: 'Product not found' });
    }
    console.log("✅ Product deleted:", result.rows[0]);
    res.json({ deleted: true, product: result.rows[0] });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// --- SEARCH products ---
router.get('/search', async (req, res) => {
  console.log("➡️ GET /api/products/search", req.query);
  try {
    const { name, feature, fieldKey, fieldValue } = req.query;
    let q = 'SELECT * FROM products WHERE 1=1';
    const values = [];
    let idx = 1;

    if (name) {
      q += ` AND LOWER(name) LIKE $${idx++}`;
      values.push(`%${name.toLowerCase()}%`);
    }

    if (feature && ['isTopSelling','isFeatured','isBudgetFriendly'].includes(feature)) {
      q += ` AND "${feature}" = true`;
    }

    if (fieldKey && fieldValue) {
      q += ` AND "customFields"::jsonb @> $${idx++}::jsonb`;
      values.push(JSON.stringify({ [fieldKey]: fieldValue }));
    }

    q += ' ORDER BY name';
    console.log("🔍 Search query:", q, values);
    const result = await db.query(q, values);
    console.log("✅ Search results:", result.rows.length);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error searching products:", err);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

module.exports = router;
