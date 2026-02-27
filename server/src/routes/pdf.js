const express = require('express');
const router = express.Router();
const { getDb } = require('../database');

function formatCurrency(num) {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function generateInvoiceHTML(invoice) {
  const isIgst = invoice.is_igst;

  const itemRows = invoice.items.map((item, index) => `
    <tr>
      <td style="text-align:center">${index + 1}</td>
      <td>${item.description}</td>
      <td style="text-align:center">${item.hsn_code}</td>
      <td style="text-align:center">${item.unit}</td>
      <td style="text-align:right">${item.quantity}</td>
      <td style="text-align:right">${formatCurrency(item.rate)}</td>
      <td style="text-align:right">${formatCurrency(item.amount)}</td>
      <td style="text-align:center">${item.gst_rate}%</td>
      ${isIgst
        ? `<td style="text-align:right">${formatCurrency(item.igst_amount)}</td>`
        : `<td style="text-align:right">${formatCurrency(item.cgst_amount)}</td>
           <td style="text-align:right">${formatCurrency(item.sgst_amount)}</td>`
      }
      <td style="text-align:right">${formatCurrency(item.total)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #333; padding: 20px; }
  .invoice-container { max-width: 800px; margin: 0 auto; border: 2px solid #2563eb; }
  .header { background: #2563eb; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 28px; letter-spacing: 2px; }
  .header .invoice-title { text-align: right; }
  .header .invoice-title h2 { font-size: 22px; margin-bottom: 5px; }
  .details { display: flex; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid #ddd; }
  .details .col { flex: 1; }
  .details .col h3 { color: #2563eb; font-size: 13px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
  .details .col p { margin-bottom: 3px; line-height: 1.5; }
  .invoice-meta { background: #f0f4ff; padding: 12px 20px; display: flex; gap: 30px; border-bottom: 1px solid #ddd; }
  .invoice-meta .meta-item { }
  .invoice-meta .meta-item label { font-weight: bold; color: #2563eb; font-size: 11px; text-transform: uppercase; }
  .invoice-meta .meta-item span { display: block; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; }
  table th { background: #2563eb; color: white; padding: 8px 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  table td { padding: 8px 6px; border-bottom: 1px solid #eee; }
  table tr:nth-child(even) { background: #f8fafc; }
  .totals { display: flex; justify-content: flex-end; padding: 0 20px 15px; }
  .totals-table { width: 300px; }
  .totals-table tr td { padding: 5px 10px; }
  .totals-table tr:last-child { background: #2563eb; color: white; font-weight: bold; font-size: 14px; }
  .amount-words { padding: 10px 20px; background: #f0f4ff; font-style: italic; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; }
  .footer { display: flex; justify-content: space-between; padding: 15px 20px; }
  .footer .bank-details h3, .footer .signature h3 { color: #2563eb; font-size: 12px; margin-bottom: 8px; text-transform: uppercase; }
  .footer .bank-details p { margin-bottom: 2px; }
  .footer .signature { text-align: right; }
  .footer .signature .sig-line { margin-top: 40px; border-top: 1px solid #333; padding-top: 5px; }
  .notes { padding: 10px 20px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
</style>
</head>
<body>
<div class="invoice-container">
  <div class="header">
    <div>
      <h1>${invoice.business_name}</h1>
      <p>${invoice.business_address}, ${invoice.business_city}</p>
      <p>${invoice.business_state} - ${invoice.business_pincode}</p>
    </div>
    <div class="invoice-title">
      <h2>TAX INVOICE</h2>
      <p>GSTIN: ${invoice.business_gstin}</p>
    </div>
  </div>

  <div class="invoice-meta">
    <div class="meta-item"><label>Invoice No</label><span>${invoice.invoice_number}</span></div>
    <div class="meta-item"><label>Date</label><span>${invoice.invoice_date}</span></div>
    ${invoice.due_date ? `<div class="meta-item"><label>Due Date</label><span>${invoice.due_date}</span></div>` : ''}
    <div class="meta-item"><label>Place of Supply</label><span>${invoice.place_of_supply} (${invoice.supply_state_code})</span></div>
  </div>

  <div class="details">
    <div class="col">
      <h3>Bill To</h3>
      <p><strong>${invoice.customer_name}</strong></p>
      <p>${invoice.customer_address}</p>
      <p>${invoice.customer_city}, ${invoice.customer_state} - ${invoice.customer_pincode}</p>
      ${invoice.customer_gstin ? `<p>GSTIN: ${invoice.customer_gstin}</p>` : ''}
      ${invoice.customer_phone ? `<p>Phone: ${invoice.customer_phone}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px">#</th>
        <th>Description</th>
        <th style="width:70px">HSN</th>
        <th style="width:40px">Unit</th>
        <th style="width:50px">Qty</th>
        <th style="width:80px">Rate</th>
        <th style="width:80px">Amount</th>
        <th style="width:50px">GST%</th>
        ${isIgst
          ? '<th style="width:80px">IGST</th>'
          : '<th style="width:70px">CGST</th><th style="width:70px">SGST</th>'
        }
        <th style="width:90px">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <table class="totals-table">
      <tr><td>Subtotal</td><td style="text-align:right">${formatCurrency(invoice.subtotal)}</td></tr>
      ${isIgst
        ? `<tr><td>IGST</td><td style="text-align:right">${formatCurrency(invoice.igst_total)}</td></tr>`
        : `<tr><td>CGST</td><td style="text-align:right">${formatCurrency(invoice.cgst_total)}</td></tr>
           <tr><td>SGST</td><td style="text-align:right">${formatCurrency(invoice.sgst_total)}</td></tr>`
      }
      <tr><td>Grand Total</td><td style="text-align:right">${formatCurrency(invoice.grand_total)}</td></tr>
    </table>
  </div>

  <div class="amount-words">
    <strong>Amount in Words:</strong> ${invoice.amount_in_words}
  </div>

  <div class="footer">
    <div class="bank-details">
      <h3>Bank Details</h3>
      ${invoice.bank_name ? `<p>Bank: ${invoice.bank_name}</p>` : ''}
      ${invoice.bank_account ? `<p>A/C No: ${invoice.bank_account}</p>` : ''}
      ${invoice.bank_ifsc ? `<p>IFSC: ${invoice.bank_ifsc}</p>` : ''}
    </div>
    <div class="signature">
      <h3>For ${invoice.business_name}</h3>
      <div class="sig-line">Authorised Signatory</div>
    </div>
  </div>

  ${invoice.notes ? `<div class="notes"><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
</div>
</body>
</html>`;
}

// GET invoice as HTML (for preview/print)
router.get('/:id/html', (req, res) => {
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

  invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id').all(req.params.id);

  const html = generateInvoiceHTML(invoice);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

module.exports = router;
