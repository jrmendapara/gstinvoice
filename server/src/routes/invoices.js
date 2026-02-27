const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { numberToWords, generateInvoiceNumber, round2 } = require('../utils');

// GET all invoices
router.get('/', (req, res) => {
  const db = getDb();
  const { status, search } = req.query;

  let query = `
    SELECT i.*, b.name as business_name, c.name as customer_name
    FROM invoices i
    JOIN businesses b ON i.business_id = b.id
    JOIN customers c ON i.customer_id = c.id
  `;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('i.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(i.invoice_number LIKE ? OR c.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY i.created_at DESC';

  const invoices = db.prepare(query).all(...params);
  res.json(invoices);
});

// GET single invoice with items
router.get('/:id', (req, res) => {
  const db = getDb();
  const invoice = db.prepare(`
    SELECT i.*, b.name as business_name, b.address as business_address, b.city as business_city,
           b.state as business_state, b.state_code as business_state_code, b.pincode as business_pincode,
           b.gstin as business_gstin, b.pan as business_pan, b.phone as business_phone, b.email as business_email,
           b.bank_name, b.bank_account, b.bank_ifsc,
           c.name as customer_name, c.address as customer_address, c.city as customer_city,
           c.state as customer_state, c.state_code as customer_state_code, c.pincode as customer_pincode,
           c.gstin as customer_gstin, c.pan as customer_pan, c.phone as customer_phone, c.email as customer_email
    FROM invoices i
    JOIN businesses b ON i.business_id = b.id
    JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ?
  `).get(req.params.id);

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id').all(req.params.id);
  invoice.items = items;

  res.json(invoice);
});

// GET next invoice number
router.get('/next/number', (req, res) => {
  const db = getDb();
  res.json({ invoice_number: generateInvoiceNumber(db) });
});

// POST create invoice
router.post('/', (req, res) => {
  const db = getDb();
  const { business_id, customer_id, invoice_date, due_date, items, notes, status } = req.body;

  if (!business_id || !customer_id || !invoice_date || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(business_id);
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
  if (!business) return res.status(400).json({ error: 'Business not found' });
  if (!customer) return res.status(400).json({ error: 'Customer not found' });

  const isIgst = business.state_code !== customer.state_code;
  const invoiceNumber = generateInvoiceNumber(db);

  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const processedItems = items.map(item => {
    const amount = round2(item.quantity * item.rate);
    const taxAmount = round2(amount * item.gst_rate / 100);
    let cgst = 0, sgst = 0, igst = 0;

    if (isIgst) {
      igst = taxAmount;
    } else {
      cgst = round2(taxAmount / 2);
      sgst = round2(taxAmount / 2);
    }

    subtotal += amount;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;

    return {
      ...item,
      amount,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      total: round2(amount + taxAmount),
    };
  });

  subtotal = round2(subtotal);
  cgstTotal = round2(cgstTotal);
  sgstTotal = round2(sgstTotal);
  igstTotal = round2(igstTotal);
  const totalTax = round2(cgstTotal + sgstTotal + igstTotal);
  const grandTotal = round2(subtotal + totalTax);
  const amountInWords = numberToWords(grandTotal);

  const createInvoice = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO invoices (invoice_number, invoice_date, due_date, business_id, customer_id, place_of_supply, supply_state_code, is_igst, subtotal, cgst_total, sgst_total, igst_total, total_tax, grand_total, amount_in_words, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceNumber, invoice_date, due_date || null, business_id, customer_id,
      customer.state, customer.state_code, isIgst ? 1 : 0,
      subtotal, cgstTotal, sgstTotal, igstTotal, totalTax, grandTotal, amountInWords,
      notes || null, status || 'draft'
    );

    const invoiceId = result.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, description, hsn_code, unit, quantity, rate, amount, gst_rate, cgst_amount, sgst_amount, igst_amount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of processedItems) {
      insertItem.run(
        invoiceId, item.product_id || null, item.description, item.hsn_code,
        item.unit || 'NOS', item.quantity, item.rate, item.amount,
        item.gst_rate, item.cgst_amount, item.sgst_amount, item.igst_amount, item.total
      );
    }

    return invoiceId;
  });

  const invoiceId = createInvoice();
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);

  res.status(201).json(invoice);
});

// PUT update invoice (full edit for draft invoices)
router.put('/:id', (req, res) => {
  const db = getDb();
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status !== 'draft') {
    return res.status(400).json({ error: 'Only draft invoices can be edited' });
  }

  const { customer_id, invoice_date, due_date, items, notes } = req.body;
  if (!customer_id || !invoice_date || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(invoice.business_id);
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
  if (!customer) return res.status(400).json({ error: 'Customer not found' });

  const isIgst = business.state_code !== customer.state_code;

  let subtotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const processedItems = items.map(item => {
    const amount = round2(item.quantity * item.rate);
    const taxAmount = round2(amount * item.gst_rate / 100);
    let cgst = 0, sgst = 0, igst = 0;

    if (isIgst) {
      igst = taxAmount;
    } else {
      cgst = round2(taxAmount / 2);
      sgst = round2(taxAmount / 2);
    }

    subtotal += amount;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;

    return {
      ...item,
      amount,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      total: round2(amount + taxAmount),
    };
  });

  subtotal = round2(subtotal);
  cgstTotal = round2(cgstTotal);
  sgstTotal = round2(sgstTotal);
  igstTotal = round2(igstTotal);
  const totalTax = round2(cgstTotal + sgstTotal + igstTotal);
  const grandTotal = round2(subtotal + totalTax);
  const amountInWords = numberToWords(grandTotal);

  const updateInvoice = db.transaction(() => {
    db.prepare(`
      UPDATE invoices SET customer_id = ?, invoice_date = ?, due_date = ?, place_of_supply = ?,
        supply_state_code = ?, is_igst = ?, subtotal = ?, cgst_total = ?, sgst_total = ?,
        igst_total = ?, total_tax = ?, grand_total = ?, amount_in_words = ?, notes = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      customer_id, invoice_date, due_date || null, customer.state, customer.state_code,
      isIgst ? 1 : 0, subtotal, cgstTotal, sgstTotal, igstTotal, totalTax, grandTotal,
      amountInWords, notes || null, req.params.id
    );

    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(req.params.id);

    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, product_id, description, hsn_code, unit, quantity, rate, amount, gst_rate, cgst_amount, sgst_amount, igst_amount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of processedItems) {
      insertItem.run(
        req.params.id, item.product_id || null, item.description, item.hsn_code,
        item.unit || 'NOS', item.quantity, item.rate, item.amount,
        item.gst_rate, item.cgst_amount, item.sgst_amount, item.igst_amount, item.total
      );
    }
  });

  updateInvoice();

  const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  updated.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  res.json(updated);
});

// PUT update invoice status
router.put('/:id/status', (req, res) => {
  const db = getDb();
  const { status } = req.body;
  if (!['draft', 'sent', 'paid', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare("UPDATE invoices SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  res.json(invoice);
});

// DELETE invoice
router.delete('/:id', (req, res) => {
  const db = getDb();
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status === 'paid') {
    return res.status(400).json({ error: 'Cannot delete a paid invoice' });
  }
  db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// GET dashboard stats
router.get('/stats/dashboard', (req, res) => {
  const db = getDb();
  const totalInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(grand_total), 0) as total FROM invoices WHERE status != ?').get('cancelled').total;
  const totalTax = db.prepare('SELECT COALESCE(SUM(total_tax), 0) as total FROM invoices WHERE status != ?').get('cancelled').total;
  const paidInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE status = ?').get('paid').count;
  const pendingInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE status IN (?, ?)').get('draft', 'sent').count;
  const recentInvoices = db.prepare(`
    SELECT i.id, i.invoice_number, i.invoice_date, i.grand_total, i.status, c.name as customer_name
    FROM invoices i JOIN customers c ON i.customer_id = c.id
    ORDER BY i.created_at DESC LIMIT 5
  `).all();

  res.json({
    totalInvoices,
    totalRevenue: round2(totalRevenue),
    totalTax: round2(totalTax),
    paidInvoices,
    pendingInvoices,
    recentInvoices,
  });
});

module.exports = router;
