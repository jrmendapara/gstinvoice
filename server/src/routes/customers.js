const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET all customers
router.get('/', (req, res) => {
  const db = getDb();
  const { search } = req.query;
  let customers;
  if (search) {
    customers = db.prepare('SELECT * FROM customers WHERE name LIKE ? OR gstin LIKE ? ORDER BY name').all(`%${search}%`, `%${search}%`);
  } else {
    customers = db.prepare('SELECT * FROM customers ORDER BY name').all();
  }
  res.json(customers);
});

// GET single customer
router.get('/:id', (req, res) => {
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
});

// POST create customer
router.post('/', (req, res) => {
  const db = getDb();
  const { name, address, city, state, state_code, pincode, gstin, pan, phone, email } = req.body;

  if (!name || !address || !city || !state || !state_code || !pincode) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = db.prepare(`
    INSERT INTO customers (name, address, city, state, state_code, pincode, gstin, pan, phone, email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, address, city, state, state_code, pincode, gstin || null, pan || null, phone || null, email || null);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(customer);
});

// PUT update customer
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, address, city, state, state_code, pincode, gstin, pan, phone, email } = req.body;

  db.prepare(`
    UPDATE customers SET name=?, address=?, city=?, state=?, state_code=?, pincode=?, gstin=?, pan=?, phone=?, email=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name, address, city, state, state_code, pincode, gstin || null, pan || null, phone || null, email || null, req.params.id);

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  res.json(customer);
});

// DELETE customer
router.delete('/:id', (req, res) => {
  const db = getDb();
  const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?').get(req.params.id);
  if (invoiceCount.count > 0) {
    return res.status(400).json({ error: 'Cannot delete customer with existing invoices' });
  }
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
