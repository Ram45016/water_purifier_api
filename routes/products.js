const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// Setup multer for blob storage
const storage = multer.memoryStorage(); // store in memory as Buffer
const upload = multer({ storage });

// --- GET all products ---
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// --- GET product by ID ---
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// --- CREATE product ---
router.post('/', authenticateToken, authorizeRoles('admin'), upload.array('images'), async (req, res) => {
  try {
    const p = req.body;
    let images = [];

    // Convert uploaded files to base64 strings (or store buffer directly in DB if preferred)
    if (req.files) {
      images = req.files.map(file => file.buffer.toString('base64'));
    } else if (p.images) {
      images = JSON.parse(p.images); // in case frontend sends JSON array
    }

    const q = `INSERT INTO products
      (id, name, "brandName", "buyingPrice", "sellingPrice", "vendorPrice", quantity, date, images, "isTopSelling", "isFeatured", "isBudgetFriendly", "customFields")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`;

    const values = [
      p.id, p.name, p.brandName, p.buyingPrice, p.sellingPrice, p.vendorPrice,
      p.quantity, p.date, JSON.stringify(images),
      p.isTopSelling || false, p.isFeatured || false, p.isBudgetFriendly || false,
      JSON.stringify(p.customFields || [])
    ];

    const result = await db.query(q, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// --- UPDATE product ---
router.put('/:id', authenticateToken, authorizeRoles('admin'), upload.array('images'), async (req, res) => {
  try {
    const p = req.body;

    // Merge existing images with uploaded blobs
    let existing = await db.query('SELECT images FROM products WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Product not found' });
    existing = existing.rows[0].images || [];

    let uploadedImages = [];
    if (req.files) uploadedImages = req.files.map(f => f.buffer.toString('base64'));
    const images = JSON.stringify([...existing, ...uploadedImages]);

    const q = `UPDATE products SET
      name=$1, "brandName"=$2, "buyingPrice"=$3, "sellingPrice"=$4, "vendorPrice"=$5,
      quantity=$6, date=$7, images=$8, "isTopSelling"=$9, "isFeatured"=$10, "isBudgetFriendly"=$11, "customFields"=$12
      WHERE id=$13 RETURNING *`;

    const values = [
      p.name, p.brandName, p.buyingPrice, p.sellingPrice, p.vendorPrice,
      p.quantity, p.date, images,
      p.isTopSelling || false, p.isFeatured || false, p.isBudgetFriendly || false,
      JSON.stringify(p.customFields || []), req.params.id
    ];

    const result = await db.query(q, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// --- DELETE product ---
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Product not found' });
    res.json({ deleted: true, product: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// --- SEARCH products ---
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

    if (feature && ['isTopSelling','isFeatured','isBudgetFriendly'].includes(feature)) {
      q += ` AND "${feature}" = true`;
    }

    if (fieldKey && fieldValue) {
      q += ` AND "customFields"::jsonb @> $${idx++}::jsonb`;
      values.push(JSON.stringify({ [fieldKey]: fieldValue }));
    }

    q += ' ORDER BY name';
    const result = await db.query(q, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

module.exports = router;
