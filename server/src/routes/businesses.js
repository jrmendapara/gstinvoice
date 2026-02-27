const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

// GET all businesses
router.get('/', (req, res) => {
  const db = getDb();
  const businesses = db.prepare('SELECT * FROM businesses ORDER BY name').all();
  res.json(businesses);
});

// GET single business
router.get('/:id', (req, res) => {
  const db = getDb();
  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
  if (!business) return res.status(404).json({ error: 'Business not found' });
  res.json(business);
});

// GET default business
router.get('/default/info', (req, res) => {
  const db = getDb();
  const business = db.prepare('SELECT * FROM businesses WHERE is_default = 1').get();
  if (!business) return res.status(404).json({ error: 'No default business configured' });
  res.json(business);
});

// POST create business
router.post('/', (req, res) => {
  const db = getDb();
  const { name, address, city, state, state_code, pincode, gstin, pan, phone, email, bank_name, bank_account, bank_ifsc, is_default } = req.body;

  if (!name || !address || !city || !state || !state_code || !pincode || !gstin) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (is_default) {
    db.prepare('UPDATE businesses SET is_default = 0').run();
  }

  const result = db.prepare(`
    INSERT INTO businesses (name, address, city, state, state_code, pincode, gstin, pan, phone, email, bank_name, bank_account, bank_ifsc, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, address, city, state, state_code, pincode, gstin, pan || null, phone || null, email || null, bank_name || null, bank_account || null, bank_ifsc || null, is_default ? 1 : 0);

  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(business);
});

// PUT update business
router.put('/:id', (req, res) => {
  const db = getDb();
  const { name, address, city, state, state_code, pincode, gstin, pan, phone, email, bank_name, bank_account, bank_ifsc, is_default } = req.body;

  if (is_default) {
    db.prepare('UPDATE businesses SET is_default = 0').run();
  }

  db.prepare(`
    UPDATE businesses SET name=?, address=?, city=?, state=?, state_code=?, pincode=?, gstin=?, pan=?, phone=?, email=?, bank_name=?, bank_account=?, bank_ifsc=?, is_default=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name, address, city, state, state_code, pincode, gstin, pan || null, phone || null, email || null, bank_name || null, bank_account || null, bank_ifsc || null, is_default ? 1 : 0, req.params.id);

  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(req.params.id);
  res.json(business);
});

// DELETE business
router.delete('/:id', (req, res) => {
  const db = getDb();
  const invoiceCount = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE business_id = ?').get(req.params.id);
  if (invoiceCount.count > 0) {
    return res.status(400).json({ error: 'Cannot delete business with existing invoices' });
  }
  db.prepare('DELETE FROM businesses WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
