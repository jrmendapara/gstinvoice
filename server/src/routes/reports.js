const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { round2 } = require('../utils');

// GET GSTR-1 report (outward supplies)
router.get('/gstr1', (req, res) => {
  const db = getDb();
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to date parameters are required' });
  }

  const invoices = db.prepare(`
    SELECT i.*, c.name as customer_name, c.gstin as customer_gstin, c.state as customer_state, c.state_code as customer_state_code
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.invoice_date >= ? AND i.invoice_date <= ? AND i.status != 'cancelled'
    ORDER BY i.invoice_date
  `).all(from, to);

  // Attach items
  const getItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id');
  for (const inv of invoices) {
    inv.items = getItems.all(inv.id);
  }

  // B2B: Invoices to registered dealers (with GSTIN)
  const b2b = invoices.filter(inv => inv.customer_gstin);
  // B2C: Invoices to unregistered dealers (without GSTIN)
  const b2c = invoices.filter(inv => !inv.customer_gstin);

  // HSN-wise summary
  const hsnMap = {};
  for (const inv of invoices) {
    for (const item of inv.items) {
      const key = `${item.hsn_code}_${item.gst_rate}`;
      if (!hsnMap[key]) {
        hsnMap[key] = { hsn_code: item.hsn_code, description: item.description, gst_rate: item.gst_rate, quantity: 0, taxable_value: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
      }
      hsnMap[key].quantity += item.quantity;
      hsnMap[key].taxable_value = round2(hsnMap[key].taxable_value + item.amount);
      hsnMap[key].cgst = round2(hsnMap[key].cgst + item.cgst_amount);
      hsnMap[key].sgst = round2(hsnMap[key].sgst + item.sgst_amount);
      hsnMap[key].igst = round2(hsnMap[key].igst + item.igst_amount);
      hsnMap[key].total = round2(hsnMap[key].total + item.total);
    }
  }

  // Summary totals
  const summary = {
    total_invoices: invoices.length,
    total_taxable: round2(invoices.reduce((s, i) => s + i.subtotal, 0)),
    total_cgst: round2(invoices.reduce((s, i) => s + i.cgst_total, 0)),
    total_sgst: round2(invoices.reduce((s, i) => s + i.sgst_total, 0)),
    total_igst: round2(invoices.reduce((s, i) => s + i.igst_total, 0)),
    total_tax: round2(invoices.reduce((s, i) => s + i.total_tax, 0)),
    grand_total: round2(invoices.reduce((s, i) => s + i.grand_total, 0)),
  };

  res.json({
    b2b: b2b.map(inv => ({
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      customer_name: inv.customer_name,
      customer_gstin: inv.customer_gstin,
      customer_state: inv.customer_state,
      is_igst: inv.is_igst,
      subtotal: inv.subtotal,
      cgst_total: inv.cgst_total,
      sgst_total: inv.sgst_total,
      igst_total: inv.igst_total,
      total_tax: inv.total_tax,
      grand_total: inv.grand_total,
    })),
    b2c: b2c.map(inv => ({
      invoice_number: inv.invoice_number,
      invoice_date: inv.invoice_date,
      customer_name: inv.customer_name,
      customer_state: inv.customer_state,
      is_igst: inv.is_igst,
      subtotal: inv.subtotal,
      cgst_total: inv.cgst_total,
      sgst_total: inv.sgst_total,
      igst_total: inv.igst_total,
      total_tax: inv.total_tax,
      grand_total: inv.grand_total,
    })),
    hsn_summary: Object.values(hsnMap),
    summary,
  });
});

// GET GSTR-3B report (summary return)
router.get('/gstr3b', (req, res) => {
  const db = getDb();
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to date parameters are required' });
  }

  const invoices = db.prepare(`
    SELECT i.*
    FROM invoices i
    WHERE i.invoice_date >= ? AND i.invoice_date <= ? AND i.status != 'cancelled'
  `).all(from, to);

  // Credit notes
  const creditNotes = db.prepare(`
    SELECT cn.*
    FROM credit_notes cn
    WHERE cn.credit_note_date >= ? AND cn.credit_note_date <= ? AND cn.status != 'cancelled'
  `);

  let cnData = [];
  try {
    cnData = creditNotes.all(from, to);
  } catch (e) {
    // credit_notes table may not exist yet
  }

  // 3.1 - Outward supplies
  const interState = invoices.filter(i => i.is_igst);
  const intraState = invoices.filter(i => !i.is_igst);

  const section31 = {
    inter_state: {
      taxable: round2(interState.reduce((s, i) => s + i.subtotal, 0)),
      igst: round2(interState.reduce((s, i) => s + i.igst_total, 0)),
    },
    intra_state: {
      taxable: round2(intraState.reduce((s, i) => s + i.subtotal, 0)),
      cgst: round2(intraState.reduce((s, i) => s + i.cgst_total, 0)),
      sgst: round2(intraState.reduce((s, i) => s + i.sgst_total, 0)),
    },
  };

  // 3.2 - Tax breakdown by rate
  const getItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?');
  const rateMap = {};
  for (const inv of invoices) {
    const items = getItems.all(inv.id);
    for (const item of items) {
      const rate = item.gst_rate;
      if (!rateMap[rate]) {
        rateMap[rate] = { gst_rate: rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, total_tax: 0 };
      }
      rateMap[rate].taxable = round2(rateMap[rate].taxable + item.amount);
      rateMap[rate].cgst = round2(rateMap[rate].cgst + item.cgst_amount);
      rateMap[rate].sgst = round2(rateMap[rate].sgst + item.sgst_amount);
      rateMap[rate].igst = round2(rateMap[rate].igst + item.igst_amount);
      rateMap[rate].total_tax = round2(rateMap[rate].total_tax + item.cgst_amount + item.sgst_amount + item.igst_amount);
    }
  }

  // Credit note totals
  const cnTotals = {
    taxable: round2(cnData.reduce((s, cn) => s + (cn.subtotal || 0), 0)),
    cgst: round2(cnData.reduce((s, cn) => s + (cn.cgst_total || 0), 0)),
    sgst: round2(cnData.reduce((s, cn) => s + (cn.sgst_total || 0), 0)),
    igst: round2(cnData.reduce((s, cn) => s + (cn.igst_total || 0), 0)),
    total_tax: round2(cnData.reduce((s, cn) => s + (cn.total_tax || 0), 0)),
    count: cnData.length,
  };

  const totals = {
    total_invoices: invoices.length,
    total_taxable: round2(invoices.reduce((s, i) => s + i.subtotal, 0)),
    total_cgst: round2(invoices.reduce((s, i) => s + i.cgst_total, 0)),
    total_sgst: round2(invoices.reduce((s, i) => s + i.sgst_total, 0)),
    total_igst: round2(invoices.reduce((s, i) => s + i.igst_total, 0)),
    total_tax: round2(invoices.reduce((s, i) => s + i.total_tax, 0)),
    net_tax: round2(invoices.reduce((s, i) => s + i.total_tax, 0) - cnTotals.total_tax),
  };

  res.json({
    section_31: section31,
    tax_by_rate: Object.values(rateMap).sort((a, b) => a.gst_rate - b.gst_rate),
    credit_notes: cnTotals,
    totals,
  });
});

// GET CSV export of invoices
router.get('/export/invoices', (req, res) => {
  const db = getDb();
  const { from, to, status } = req.query;

  let query = `
    SELECT i.*, c.name as customer_name, c.gstin as customer_gstin, c.state as customer_state
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
  `;
  const conditions = [];
  const params = [];

  if (from) { conditions.push('i.invoice_date >= ?'); params.push(from); }
  if (to) { conditions.push('i.invoice_date <= ?'); params.push(to); }
  if (status) { conditions.push('i.status = ?'); params.push(status); }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY i.invoice_date';

  const invoices = db.prepare(query).all(...params);

  const headers = ['Invoice Number', 'Date', 'Due Date', 'Customer', 'GSTIN', 'State', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax', 'Grand Total', 'Status'];
  const rows = invoices.map(inv => [
    inv.invoice_number,
    inv.invoice_date,
    inv.due_date || '',
    inv.customer_name,
    inv.customer_gstin || '',
    inv.customer_state,
    inv.subtotal,
    inv.cgst_total,
    inv.sgst_total,
    inv.igst_total,
    inv.total_tax,
    inv.grand_total,
    inv.status,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=invoices_${from || 'all'}_${to || 'all'}.csv`);
  res.send(csv);
});

// GET CSV export of items (detailed)
router.get('/export/items', (req, res) => {
  const db = getDb();
  const { from, to } = req.query;

  let query = `
    SELECT i.invoice_number, i.invoice_date, i.status, c.name as customer_name, c.gstin as customer_gstin,
           ii.description, ii.hsn_code, ii.unit, ii.quantity, ii.rate, ii.amount, ii.gst_rate,
           ii.cgst_amount, ii.sgst_amount, ii.igst_amount, ii.total
    FROM invoice_items ii
    JOIN invoices i ON ii.invoice_id = i.id
    JOIN customers c ON i.customer_id = c.id
  `;
  const conditions = [];
  const params = [];

  if (from) { conditions.push('i.invoice_date >= ?'); params.push(from); }
  if (to) { conditions.push('i.invoice_date <= ?'); params.push(to); }
  conditions.push("i.status != 'cancelled'");

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY i.invoice_date, i.id, ii.id';

  const items = db.prepare(query).all(...params);

  const headers = ['Invoice #', 'Date', 'Customer', 'GSTIN', 'Description', 'HSN Code', 'Unit', 'Qty', 'Rate', 'Taxable Value', 'GST%', 'CGST', 'SGST', 'IGST', 'Total'];
  const rows = items.map(item => [
    item.invoice_number, item.invoice_date, item.customer_name, item.customer_gstin || '',
    item.description, item.hsn_code, item.unit, item.quantity, item.rate, item.amount,
    item.gst_rate, item.cgst_amount, item.sgst_amount, item.igst_amount, item.total,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=invoice_items_${from || 'all'}_${to || 'all'}.csv`);
  res.send(csv);
});

module.exports = router;
