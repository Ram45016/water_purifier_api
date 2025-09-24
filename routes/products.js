const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const { camelToSnake } = require("../utils/caseConverter");
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.get('/search', async (req, res) => {
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
    const result = await db.query(q, values);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error searching products:", err);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

// --- GET all products ---
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching products:", err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// --- GET product by ID ---
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching product:", err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// --- CREATE product (no image upload) ---
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const p = camelToSnake(req.body);

    let images = [];
    if (typeof p.images === "string") {
      try {
        images = JSON.parse(p.images);
      } catch {
        images = [];
      }
    } else if (Array.isArray(p.images)) {
      images = p.images;
    }

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

    const result = await db.query(q, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error creating product:", err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// --- UPDATE product (no image upload) ---
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const p = camelToSnake(req.body);

    const existsRes = await db.query('SELECT id FROM products WHERE id = $1', [req.params.id]);
    if (!existsRes.rows.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let images = [];
    if (typeof p.images === "string") {
      try {
        images = JSON.parse(p.images);
      } catch {
        images = [];
      }
    } else if (Array.isArray(p.images)) {
      images = p.images;
    }

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
      JSON.stringify(images),
      p.is_top_selling === "true" || p.is_top_selling === true,
      p.is_featured === "true" || p.is_featured === true,
      p.is_budget_friendly === "true" || p.is_budget_friendly === true,
      JSON.stringify(custom_fields),
      p.description || null,
      req.params.id
    ];

    const result = await db.query(q, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating product:", err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// --- DELETE product with Cloudinary image deletion ---
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    // 1. Fetch the product first
    const productRes = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!productRes.rows.length) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const product = productRes.rows[0];

    // 2. Extract public IDs from product.images
    let images = [];
    if (product.images) {
      try {
        images = JSON.parse(product.images);
      } catch {
        images = [];
      }
    }

    // Helper to extract public ID from Cloudinary URL
    const getPublicId = (url) => {
      // Example URL:
      // https://res.cloudinary.com/<cloud_name>/image/upload/v<version>/<public_id>.<ext>
      // We want the "<public_id>" part without extension
      const parts = url.split('/');
      const fileWithExt = parts.pop(); // last part with extension
      return fileWithExt.substring(0, fileWithExt.lastIndexOf('.')); // remove extension
    };

    const publicIds = images.map(getPublicId);

    // 3. Delete images from Cloudinary if any
    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds);
    }

    // 4. Delete product from DB
    const deleteRes = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);

    res.json({ deleted: true, product: deleteRes.rows[0] });
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
