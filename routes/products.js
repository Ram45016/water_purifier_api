const express = require('express');
const router = express.Router();
const db = require('../db');

const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST /api/products
router.post('/',authenticateToken, authorizeRoles('admin'),  async (req, res) => {
  try {
    const p = req.body;
    const q = `INSERT INTO products
      (id, name, brandName, buyingPrice, sellingPrice, vendorPrice, quantity, date, images, isTopSelling, isFeatured, isBudgetFriendly, customFields)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`;
    const values = [
      p.id, p.name, p.brandName, p.buyingPrice, p.sellingPrice, p.vendorPrice,
      p.quantity, p.date, JSON.stringify(p.images || []),
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

// PUT /api/products/:id
router.put('/:id',authenticateToken, authorizeRoles('admin'),  async (req, res) => {
  try {
    const p = req.body;
    const q = `UPDATE products SET
      name=$1, brandName=$2, buyingPrice=$3, sellingPrice=$4, vendorPrice=$5,
      quantity=$6, date=$7, images=$8, isTopSelling=$9, isFeatured=$10, isBudgetFriendly=$11, customFields=$12
      WHERE id=$13 RETURNING *`;
    const values = [
      p.name, p.brandName, p.buyingPrice, p.sellingPrice, p.vendorPrice,
      p.quantity, p.date, JSON.stringify(p.images || []),
      p.isTopSelling || false, p.isFeatured || false, p.isBudgetFriendly || false,
      JSON.stringify(p.customFields || []), req.params.id
    ];
    const result = await db.query(q, values);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/products/:id
router.delete('/:id',authenticateToken, authorizeRoles('admin'),  async (req, res) => {
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ deleted: true, product: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// // GET /api/products/search?name=xyz&feature=isFeatured
// router.get('/search', async (req, res) => {
//   try {
//     const { name, feature } = req.query;
//     let q = 'SELECT * FROM products WHERE 1=1';
//     const values = [];
//     let idx = 1;

//     // Search by product name (case-insensitive partial match)
//     if (name) {
//       q += ` AND LOWER(name) LIKE $${idx++}`;
//       values.push(`%${name.toLowerCase()}%`);
//     }

//     // Search by feature (e.g., isTopSelling, isFeatured, isBudgetFriendly)
//     if (feature) {
//       if (['isTopSelling', 'isFeatured', 'isBudgetFriendly'].includes(feature)) {
//         q += ` AND ${feature} = true`;
//       } else {
//         return res.status(400).json({ error: 'Invalid feature filter' });
//       }
//     }

//     q += ' ORDER BY name';

//     const result = await db.query(q, values);
//     res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Failed to search products' });
//   }
// });

// GET /api/products/search?name=xyz&feature=isFeatured&fieldKey=color&fieldValue=blue
router.get('/search', async (req, res) => {
  try {
    const { name, feature, fieldKey, fieldValue } = req.query;
    let q = 'SELECT * FROM products WHERE 1=1';
    const values = [];
    let idx = 1;

    // Search by product name (case-insensitive partial match)
    if (name) {
      q += ` AND LOWER(name) LIKE $${idx++}`;
      values.push(`%${name.toLowerCase()}%`);
    }

    // Search by feature (e.g., isTopSelling, isFeatured, isBudgetFriendly)
    if (feature) {
      if (['isTopSelling', 'isFeatured', 'isBudgetFriendly'].includes(feature)) {
        q += ` AND ${feature} = true`;
      } else {
        return res.status(400).json({ error: 'Invalid feature filter' });
      }
    }

    // Search inside customFields JSON
    if (fieldKey && fieldValue) {
      q += ` AND customFields::jsonb @> $${idx++}::jsonb`;
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
