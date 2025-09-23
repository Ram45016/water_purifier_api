const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const { camelToSnake } = require("../utils/caseConverter");


const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fieldSize: 10 * 1024 * 1024, // ✅ Fix: increase field size limit to 10MB
    fileSize: 5 * 1024 * 1024,   // Optional: image size limit per file
    files: 5,                    // Optional: limit number of files
  },
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

    if (feature && ['is_top_selling', 'is_featured', 'is_budget_friendly'].includes(feature)) {
      q += ` AND "${feature}" = true`;
    }

    if (fieldKey && fieldValue) {
      q += ` AND "custom_fields"::jsonb @> $${idx++}::jsonb`;
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
    const p = camelToSnake(req.body);

    console.log("📝 Request body (snake_case):", p);
    console.log("📸 Uploaded files:", req.files?.length || 0);

    let custom_fields = [];
    if (typeof p.custom_fields === "string") {
      try {
        custom_fields = JSON.parse(p.custom_fields);
      } catch {
        custom_fields = [];
      }
    } else if (p.custom_fields) {
      custom_fields = p.custom_fields;
    }

    let images = p.images || [];

    const q = `
      INSERT INTO products
        (id, name, "brand_name", "buying_price", "selling_price", "vendor_price",
         quantity, date, images, "is_top_selling", "is_featured", "is_budget_friendly", "custom_fields", description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
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
      JSON.stringify(images),
      p.is_top_selling === "true" || p.is_top_selling === true,
      p.is_featured === "true" || p.is_featured === true,
      p.is_budget_friendly === "true" || p.is_budget_friendly === true,
      JSON.stringify(custom_fields),
      p.description || null
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
    const p = camelToSnake(req.body);

    console.log("📝 Request body (snake_case):", p);
    console.log("📸 Uploaded files:", req.files?.length || 0);

    const existsRes = await db.query('SELECT id FROM products WHERE id = $1', [req.params.id]);
    if (!existsRes.rows.length) {
      console.warn(`⚠️ Product not found: ID=${req.params.id}`);
      return res.status(404).json({ error: 'Product not found' });
    }

    let uploadedImages = [];
    if (req.files && req.files.length) {
      uploadedImages = req.files.map(f => f.buffer.toString('base64'));
    }

    let bodyImages = [];
    if (p.images) {
      if (typeof p.images === "string") {
        try {
          bodyImages = JSON.parse(p.images);
        } catch {
          console.warn("⚠️ Failed to parse images from body");
          bodyImages = [];
        }
      } else if (Array.isArray(p.images)) {
        bodyImages = p.images;
      }
    }

    const images = JSON.stringify([...bodyImages, ...uploadedImages]);

    let custom_fields = [];
    if (typeof p.custom_fields === "string") {
      try {
        custom_fields = JSON.parse(p.custom_fields);
      } catch {
        console.warn("⚠️ Failed to parse custom_fields from body");
        custom_fields = [];
      }
    } else if (p.custom_fields) {
      custom_fields = p.custom_fields;
    }

    const q = `
      UPDATE products SET
        name=$1, "brand_name"=$2, "buying_price"=$3, "selling_price"=$4, "vendor_price"=$5,
        quantity=$6, date=$7, images=$8, "is_top_selling"=$9, "is_featured"=$10,
        "is_budget_friendly"=$11, "custom_fields"=$12, description=$13
      WHERE id=$14 RETURNING *
    `;

    const values = [
      p.name,
      p.brand_name,
      p.buying_price,
      p.selling_price,
      p.vendor_price,
      p.quantity,
      p.date,
      images,
      p.is_top_selling === "true" || p.is_top_selling === true,
      p.is_featured === "true" || p.is_featured === true,
      p.is_budget_friendly === "true" || p.is_budget_friendly === true,
      JSON.stringify(custom_fields),
      p.description || null,
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

module.exports = router;
