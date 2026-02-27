const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET all products
router.get('/', (req, res) => {
  const db = getDb();
  const { search } = req.query;
  let products;
  if (search) {
    products = db.prepare('SELECT * FROM products WHERE name LIKE ? OR hsn_code LIKE ? ORDER BY name').all(`%${search}%`, `%${search}%`);
  } else {
    products = db.prepare('SELECT * FROM products ORDER BY name').all();
  }
  res.json(products);
});

// GET single product
router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// POST create product
router.post('/', (req, res) => {
  const db = getDb();
  const { name, hsn_code, unit, rate, gst_rate } = req.body;

  if (!name || !hsn_code) {
    return res.status(400).json({ error: 'Name and HSN code are required' });
  }

  const result = db.prepare(`
    INSERT INTO products (name, hsn_code, unit, rate, gst_rate)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, hsn_code, unit || 'NOS', rate || 0, gst_rate ?? 18);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
});

// PUT update product
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, hsn_code, unit, rate, gst_rate } = req.body;

  db.prepare(`
    UPDATE products SET name=?, hsn_code=?, unit=?, rate=?, gst_rate=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name, hsn_code, unit || 'NOS', rate || 0, gst_rate ?? 18, req.params.id);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(product);
});

// DELETE product
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
