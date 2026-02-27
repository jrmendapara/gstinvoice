const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { numberToWords, round2 } = require('../utils');

function generateCreditNoteNumber(db) {
  const currentYear = new Date().getFullYear();
  const financialYear = new Date().getMonth() >= 3 ? currentYear : currentYear - 1;
  const fy = `${financialYear}-${(financialYear + 1).toString().slice(2)}`;

  const last = db.prepare(
    "SELECT credit_note_number FROM credit_notes WHERE credit_note_number LIKE ? ORDER BY id DESC LIMIT 1"
  ).get(`CN/${fy}/%`);

  let nextNum = 1;
  if (last) {
    const parts = last.credit_note_number.split('/');
    nextNum = parseInt(parts[2], 10) + 1;
  }

  return `CN/${fy}/${String(nextNum).padStart(4, '0')}`;
}

// GET all credit notes
router.get('/', (req, res) => {
  const db = getDb();
  const { status, search } = req.query;

  let query = `
    SELECT cn.*, c.name as customer_name, i.invoice_number as original_invoice
    FROM credit_notes cn
    JOIN customers c ON cn.customer_id = c.id
    LEFT JOIN invoices i ON cn.invoice_id = i.id
  `;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('cn.status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(cn.credit_note_number LIKE ? OR c.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY cn.created_at DESC';

  const creditNotes = db.prepare(query).all(...params);
  res.json(creditNotes);
});

// GET single credit note
router.get('/:id', (req, res) => {
  const db = getDb();
  const cn = db.prepare(`
    SELECT cn.*, b.name as business_name, b.address as business_address, b.city as business_city,
           b.state as business_state, b.state_code as business_state_code, b.pincode as business_pincode,
           b.gstin as business_gstin, b.bank_name, b.bank_account, b.bank_ifsc,
           c.name as customer_name, c.address as customer_address, c.city as customer_city,
           c.state as customer_state, c.state_code as customer_state_code, c.pincode as customer_pincode,
           c.gstin as customer_gstin,
           i.invoice_number as original_invoice
    FROM credit_notes cn
    JOIN businesses b ON cn.business_id = b.id
    JOIN customers c ON cn.customer_id = c.id
    LEFT JOIN invoices i ON cn.invoice_id = i.id
    WHERE cn.id = ?
  `).get(req.params.id);

  if (!cn) return res.status(404).json({ error: 'Credit note not found' });

  cn.items = db.prepare('SELECT * FROM credit_note_items WHERE credit_note_id = ? ORDER BY id').all(req.params.id);
  res.json(cn);
});

// POST create credit note
router.post('/', (req, res) => {
  const db = getDb();
  const { business_id, customer_id, credit_note_date, invoice_id, reason, items, notes } = req.body;

  if (!business_id || !customer_id || !credit_note_date || !reason || !items || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const business = db.prepare('SELECT * FROM businesses WHERE id = ?').get(business_id);
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
  if (!business) return res.status(400).json({ error: 'Business not found' });
  if (!customer) return res.status(400).json({ error: 'Customer not found' });

  const isIgst = business.state_code !== customer.state_code;
  const cnNumber = generateCreditNoteNumber(db);

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

    return { ...item, amount, cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst, total: round2(amount + taxAmount) };
  });

  subtotal = round2(subtotal);
  cgstTotal = round2(cgstTotal);
  sgstTotal = round2(sgstTotal);
  igstTotal = round2(igstTotal);
  const totalTax = round2(cgstTotal + sgstTotal + igstTotal);
  const grandTotal = round2(subtotal + totalTax);
  const amountInWords = numberToWords(grandTotal);

  const create = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO credit_notes (credit_note_number, credit_note_date, invoice_id, business_id, customer_id, reason, place_of_supply, supply_state_code, is_igst, subtotal, cgst_total, sgst_total, igst_total, total_tax, grand_total, amount_in_words, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).run(
      cnNumber, credit_note_date, invoice_id || null, business_id, customer_id, reason,
      customer.state, customer.state_code, isIgst ? 1 : 0,
      subtotal, cgstTotal, sgstTotal, igstTotal, totalTax, grandTotal, amountInWords, notes || null
    );

    const cnId = result.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO credit_note_items (credit_note_id, product_id, description, hsn_code, unit, quantity, rate, amount, gst_rate, cgst_amount, sgst_amount, igst_amount, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of processedItems) {
      insertItem.run(
        cnId, item.product_id || null, item.description, item.hsn_code,
        item.unit || 'NOS', item.quantity, item.rate, item.amount,
        item.gst_rate, item.cgst_amount, item.sgst_amount, item.igst_amount, item.total
      );
    }

    return cnId;
  });

  const cnId = create();
  const creditNote = db.prepare('SELECT * FROM credit_notes WHERE id = ?').get(cnId);
  creditNote.items = db.prepare('SELECT * FROM credit_note_items WHERE credit_note_id = ?').all(cnId);
  res.status(201).json(creditNote);
});

// PUT update status
router.put('/:id/status', (req, res) => {
  const db = getDb();
  const { status } = req.body;
  if (!['draft', 'sent', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.prepare("UPDATE credit_notes SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
  const cn = db.prepare('SELECT * FROM credit_notes WHERE id = ?').get(req.params.id);
  res.json(cn);
});

// DELETE credit note
router.delete('/:id', (req, res) => {
  const db = getDb();
  const cn = db.prepare('SELECT * FROM credit_notes WHERE id = ?').get(req.params.id);
  if (!cn) return res.status(404).json({ error: 'Credit note not found' });
  if (cn.status === 'sent') {
    return res.status(400).json({ error: 'Cannot delete a sent credit note' });
  }
  db.prepare('DELETE FROM credit_notes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
