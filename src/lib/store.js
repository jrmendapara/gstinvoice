import { numberToWords, round2, generateInvoiceNumber, generateCreditNoteNumber, nowISO } from './utils';

const STORAGE_KEY = 'gst_invoice_app';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getNextId(items) {
  if (items.length === 0) return 1;
  return Math.max(...items.map(i => i.id)) + 1;
}

function initStore() {
  let data = loadData();
  if (data) return data;

  data = {
    businesses: [
      {
        id: 1, name: 'Sample Business Pvt. Ltd.', address: '123 Business Park, MG Road',
        city: 'Mumbai', state: 'Maharashtra', state_code: '27', pincode: '400001',
        gstin: '27AABCS1234A1Z5', pan: 'AABCS1234A', phone: '9876543210', email: 'info@samplebiz.com',
        bank_name: 'State Bank of India', bank_account: '1234567890123', bank_ifsc: 'SBIN0001234',
        is_default: 1, created_at: nowISO(), updated_at: nowISO()
      }
    ],
    customers: [],
    products: [
      { id: 1, name: 'Web Development Service', hsn_code: '998314', unit: 'NOS', rate: 50000, gst_rate: 18, created_at: nowISO(), updated_at: nowISO() },
      { id: 2, name: 'Mobile App Development', hsn_code: '998314', unit: 'NOS', rate: 75000, gst_rate: 18, created_at: nowISO(), updated_at: nowISO() },
      { id: 3, name: 'IT Consulting', hsn_code: '998313', unit: 'HRS', rate: 5000, gst_rate: 18, created_at: nowISO(), updated_at: nowISO() },
      { id: 4, name: 'Cloud Hosting (Annual)', hsn_code: '998315', unit: 'NOS', rate: 24000, gst_rate: 18, created_at: nowISO(), updated_at: nowISO() },
      { id: 5, name: 'Laptop', hsn_code: '8471', unit: 'NOS', rate: 55000, gst_rate: 18, created_at: nowISO(), updated_at: nowISO() },
      { id: 6, name: 'Office Chair', hsn_code: '9401', unit: 'NOS', rate: 8000, gst_rate: 18, created_at: nowISO(), updated_at: nowISO() },
      { id: 7, name: 'Printer Paper (Ream)', hsn_code: '4802', unit: 'PKT', rate: 350, gst_rate: 12, created_at: nowISO(), updated_at: nowISO() },
      { id: 8, name: 'Software License', hsn_code: '998316', unit: 'NOS', rate: 15000, gst_rate: 18, created_at: nowISO(), updated_at: nowISO() },
    ],
    invoices: [],
    invoice_items: [],
    credit_notes: [],
    credit_note_items: [],
  };

  saveData(data);
  return data;
}

let db = initStore();

function persist() {
  saveData(db);
}

// ─── Businesses ───

export function getBusinesses() {
  return [...db.businesses].sort((a, b) => a.name.localeCompare(b.name));
}

export function getDefaultBusiness() {
  const biz = db.businesses.find(b => b.is_default);
  if (!biz) throw new Error('No default business configured');
  return { ...biz };
}

export function getBusiness(id) {
  const biz = db.businesses.find(b => b.id === Number(id));
  if (!biz) throw new Error('Business not found');
  return { ...biz };
}

export function createBusiness(data) {
  if (data.is_default) {
    db.businesses.forEach(b => b.is_default = 0);
  }
  const biz = {
    id: getNextId(db.businesses),
    ...data,
    is_default: data.is_default ? 1 : 0,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
  db.businesses.push(biz);
  persist();
  return { ...biz };
}

export function updateBusiness(id, data) {
  const idx = db.businesses.findIndex(b => b.id === Number(id));
  if (idx === -1) throw new Error('Business not found');
  if (data.is_default) {
    db.businesses.forEach(b => b.is_default = 0);
  }
  db.businesses[idx] = { ...db.businesses[idx], ...data, is_default: data.is_default ? 1 : 0, updated_at: nowISO() };
  persist();
  return { ...db.businesses[idx] };
}

export function deleteBusiness(id) {
  const hasInvoices = db.invoices.some(i => i.business_id === Number(id));
  if (hasInvoices) throw new Error('Cannot delete business with existing invoices');
  db.businesses = db.businesses.filter(b => b.id !== Number(id));
  persist();
  return { success: true };
}

// ─── Customers ───

export function getCustomers(search) {
  let list = db.customers;
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(c => c.name.toLowerCase().includes(s) || (c.gstin && c.gstin.toLowerCase().includes(s)));
  }
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

export function getCustomer(id) {
  const c = db.customers.find(c => c.id === Number(id));
  if (!c) throw new Error('Customer not found');
  return { ...c };
}

export function createCustomer(data) {
  const c = {
    id: getNextId(db.customers),
    ...data,
    gstin: data.gstin || null,
    pan: data.pan || null,
    phone: data.phone || null,
    email: data.email || null,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
  db.customers.push(c);
  persist();
  return { ...c };
}

export function updateCustomer(id, data) {
  const idx = db.customers.findIndex(c => c.id === Number(id));
  if (idx === -1) throw new Error('Customer not found');
  db.customers[idx] = { ...db.customers[idx], ...data, updated_at: nowISO() };
  persist();
  return { ...db.customers[idx] };
}

export function deleteCustomer(id) {
  const hasInvoices = db.invoices.some(i => i.customer_id === Number(id));
  if (hasInvoices) throw new Error('Cannot delete customer with existing invoices');
  db.customers = db.customers.filter(c => c.id !== Number(id));
  persist();
  return { success: true };
}

// ─── Products ───

export function getProducts(search) {
  let list = db.products;
  if (search) {
    const s = search.toLowerCase();
    list = list.filter(p => p.name.toLowerCase().includes(s) || p.hsn_code.toLowerCase().includes(s));
  }
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

export function getProduct(id) {
  const p = db.products.find(p => p.id === Number(id));
  if (!p) throw new Error('Product not found');
  return { ...p };
}

export function createProduct(data) {
  const p = {
    id: getNextId(db.products),
    name: data.name,
    hsn_code: data.hsn_code,
    unit: data.unit || 'NOS',
    rate: data.rate || 0,
    gst_rate: data.gst_rate ?? 18,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
  db.products.push(p);
  persist();
  return { ...p };
}

export function updateProduct(id, data) {
  const idx = db.products.findIndex(p => p.id === Number(id));
  if (idx === -1) throw new Error('Product not found');
  db.products[idx] = {
    ...db.products[idx],
    name: data.name,
    hsn_code: data.hsn_code,
    unit: data.unit || 'NOS',
    rate: data.rate || 0,
    gst_rate: data.gst_rate ?? 18,
    updated_at: nowISO(),
  };
  persist();
  return { ...db.products[idx] };
}

export function deleteProduct(id) {
  db.products = db.products.filter(p => p.id !== Number(id));
  persist();
  return { success: true };
}

// ─── Invoices ───

export function getInvoices(params = {}) {
  let list = db.invoices.map(inv => {
    const biz = db.businesses.find(b => b.id === inv.business_id);
    const cust = db.customers.find(c => c.id === inv.customer_id);
    return { ...inv, business_name: biz?.name || '', customer_name: cust?.name || '' };
  });

  if (params.status) {
    list = list.filter(i => i.status === params.status);
  }
  if (params.search) {
    const s = params.search.toLowerCase();
    list = list.filter(i => i.invoice_number.toLowerCase().includes(s) || i.customer_name.toLowerCase().includes(s));
  }

  return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function getInvoice(id) {
  const inv = db.invoices.find(i => i.id === Number(id));
  if (!inv) throw new Error('Invoice not found');

  const biz = db.businesses.find(b => b.id === inv.business_id) || {};
  const cust = db.customers.find(c => c.id === inv.customer_id) || {};
  const items = db.invoice_items.filter(it => it.invoice_id === inv.id).sort((a, b) => a.id - b.id);

  return {
    ...inv,
    business_name: biz.name, business_address: biz.address, business_city: biz.city,
    business_state: biz.state, business_state_code: biz.state_code, business_pincode: biz.pincode,
    business_gstin: biz.gstin, business_pan: biz.pan, business_phone: biz.phone, business_email: biz.email,
    bank_name: biz.bank_name, bank_account: biz.bank_account, bank_ifsc: biz.bank_ifsc,
    customer_name: cust.name, customer_address: cust.address, customer_city: cust.city,
    customer_state: cust.state, customer_state_code: cust.state_code, customer_pincode: cust.pincode,
    customer_gstin: cust.gstin, customer_pan: cust.pan, customer_phone: cust.phone, customer_email: cust.email,
    items,
  };
}

export function getNextInvoiceNumber() {
  return { invoice_number: generateInvoiceNumber(db.invoices) };
}

export function createInvoice(data) {
  const { business_id, customer_id, invoice_date, due_date, items, notes, status } = data;
  if (!business_id || !customer_id || !invoice_date || !items || items.length === 0) {
    throw new Error('Missing required fields');
  }

  const business = db.businesses.find(b => b.id === Number(business_id));
  const customer = db.customers.find(c => c.id === Number(customer_id));
  if (!business) throw new Error('Business not found');
  if (!customer) throw new Error('Customer not found');

  const isIgst = business.state_code !== customer.state_code;
  const invoiceNumber = generateInvoiceNumber(db.invoices);

  let subtotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0;

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

  const invoiceId = getNextId(db.invoices);
  const invoice = {
    id: invoiceId,
    invoice_number: invoiceNumber, invoice_date, due_date: due_date || null,
    business_id: Number(business_id), customer_id: Number(customer_id),
    place_of_supply: customer.state, supply_state_code: customer.state_code,
    is_igst: isIgst ? 1 : 0, subtotal, cgst_total: cgstTotal, sgst_total: sgstTotal,
    igst_total: igstTotal, total_tax: totalTax, grand_total: grandTotal,
    amount_in_words: amountInWords, notes: notes || null, status: status || 'draft',
    created_at: nowISO(), updated_at: nowISO(),
  };

  db.invoices.push(invoice);

  for (const item of processedItems) {
    db.invoice_items.push({
      id: getNextId(db.invoice_items),
      invoice_id: invoiceId,
      product_id: item.product_id || null,
      description: item.description,
      hsn_code: item.hsn_code,
      unit: item.unit || 'NOS',
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
      gst_rate: item.gst_rate,
      cgst_amount: item.cgst_amount,
      sgst_amount: item.sgst_amount,
      igst_amount: item.igst_amount,
      total: item.total,
    });
  }

  persist();
  return getInvoice(invoiceId);
}

export function updateInvoice(id, data) {
  const invIdx = db.invoices.findIndex(i => i.id === Number(id));
  if (invIdx === -1) throw new Error('Invoice not found');
  if (db.invoices[invIdx].status !== 'draft') throw new Error('Only draft invoices can be edited');

  const { customer_id, invoice_date, due_date, items, notes } = data;
  if (!customer_id || !invoice_date || !items || items.length === 0) throw new Error('Missing required fields');

  const business = db.businesses.find(b => b.id === db.invoices[invIdx].business_id);
  const customer = db.customers.find(c => c.id === Number(customer_id));
  if (!customer) throw new Error('Customer not found');

  const isIgst = business.state_code !== customer.state_code;

  let subtotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0;

  const processedItems = items.map(item => {
    const amount = round2(item.quantity * item.rate);
    const taxAmount = round2(amount * item.gst_rate / 100);
    let cgst = 0, sgst = 0, igst = 0;
    if (isIgst) { igst = taxAmount; } else { cgst = round2(taxAmount / 2); sgst = round2(taxAmount / 2); }
    subtotal += amount; cgstTotal += cgst; sgstTotal += sgst; igstTotal += igst;
    return { ...item, amount, cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst, total: round2(amount + taxAmount) };
  });

  subtotal = round2(subtotal); cgstTotal = round2(cgstTotal); sgstTotal = round2(sgstTotal); igstTotal = round2(igstTotal);
  const totalTax = round2(cgstTotal + sgstTotal + igstTotal);
  const grandTotal = round2(subtotal + totalTax);
  const amountInWords = numberToWords(grandTotal);

  const invoiceId = Number(id);
  db.invoices[invIdx] = {
    ...db.invoices[invIdx],
    customer_id: Number(customer_id), invoice_date, due_date: due_date || null,
    place_of_supply: customer.state, supply_state_code: customer.state_code,
    is_igst: isIgst ? 1 : 0, subtotal, cgst_total: cgstTotal, sgst_total: sgstTotal,
    igst_total: igstTotal, total_tax: totalTax, grand_total: grandTotal,
    amount_in_words: amountInWords, notes: notes || null, updated_at: nowISO(),
  };

  db.invoice_items = db.invoice_items.filter(it => it.invoice_id !== invoiceId);
  for (const item of processedItems) {
    db.invoice_items.push({
      id: getNextId(db.invoice_items),
      invoice_id: invoiceId, product_id: item.product_id || null,
      description: item.description, hsn_code: item.hsn_code, unit: item.unit || 'NOS',
      quantity: item.quantity, rate: item.rate, amount: item.amount, gst_rate: item.gst_rate,
      cgst_amount: item.cgst_amount, sgst_amount: item.sgst_amount, igst_amount: item.igst_amount, total: item.total,
    });
  }

  persist();
  return getInvoice(invoiceId);
}

export function updateInvoiceStatus(id, status) {
  if (!['draft', 'sent', 'paid', 'cancelled'].includes(status)) throw new Error('Invalid status');
  const idx = db.invoices.findIndex(i => i.id === Number(id));
  if (idx === -1) throw new Error('Invoice not found');
  db.invoices[idx] = { ...db.invoices[idx], status, updated_at: nowISO() };
  persist();
  return { ...db.invoices[idx] };
}

export function deleteInvoice(id) {
  const inv = db.invoices.find(i => i.id === Number(id));
  if (!inv) throw new Error('Invoice not found');
  if (inv.status === 'paid') throw new Error('Cannot delete a paid invoice');
  db.invoices = db.invoices.filter(i => i.id !== Number(id));
  db.invoice_items = db.invoice_items.filter(it => it.invoice_id !== Number(id));
  persist();
  return { success: true };
}

export function getDashboard() {
  const totalInvoices = db.invoices.length;
  const active = db.invoices.filter(i => i.status !== 'cancelled');
  const totalRevenue = round2(active.reduce((s, i) => s + i.grand_total, 0));
  const totalTax = round2(active.reduce((s, i) => s + i.total_tax, 0));
  const paidInvoices = db.invoices.filter(i => i.status === 'paid').length;
  const pendingInvoices = db.invoices.filter(i => i.status === 'draft' || i.status === 'sent').length;

  const sorted = [...db.invoices].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const recentInvoices = sorted.map(inv => {
    const cust = db.customers.find(c => c.id === inv.customer_id);
    return { id: inv.id, invoice_number: inv.invoice_number, invoice_date: inv.invoice_date, grand_total: inv.grand_total, status: inv.status, customer_name: cust?.name || '' };
  });

  return { totalInvoices, totalRevenue, totalTax, paidInvoices, pendingInvoices, recentInvoices };
}

// ─── Credit Notes ───

export function getCreditNotes(params = {}) {
  let list = db.credit_notes.map(cn => {
    const cust = db.customers.find(c => c.id === cn.customer_id);
    const inv = cn.invoice_id ? db.invoices.find(i => i.id === cn.invoice_id) : null;
    return { ...cn, customer_name: cust?.name || '', original_invoice: inv?.invoice_number || null };
  });

  if (params.status) list = list.filter(cn => cn.status === params.status);
  if (params.search) {
    const s = params.search.toLowerCase();
    list = list.filter(cn => cn.credit_note_number.toLowerCase().includes(s) || cn.customer_name.toLowerCase().includes(s));
  }

  return list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function getCreditNote(id) {
  const cn = db.credit_notes.find(c => c.id === Number(id));
  if (!cn) throw new Error('Credit note not found');

  const biz = db.businesses.find(b => b.id === cn.business_id) || {};
  const cust = db.customers.find(c => c.id === cn.customer_id) || {};
  const inv = cn.invoice_id ? db.invoices.find(i => i.id === cn.invoice_id) : null;
  const items = db.credit_note_items.filter(it => it.credit_note_id === cn.id).sort((a, b) => a.id - b.id);

  return {
    ...cn,
    business_name: biz.name, business_address: biz.address, business_city: biz.city,
    business_state: biz.state, business_state_code: biz.state_code, business_pincode: biz.pincode,
    business_gstin: biz.gstin, bank_name: biz.bank_name, bank_account: biz.bank_account, bank_ifsc: biz.bank_ifsc,
    customer_name: cust.name, customer_address: cust.address, customer_city: cust.city,
    customer_state: cust.state, customer_state_code: cust.state_code, customer_pincode: cust.pincode,
    customer_gstin: cust.gstin,
    original_invoice: inv?.invoice_number || null,
    items,
  };
}

export function createCreditNote(data) {
  const { business_id, customer_id, credit_note_date, invoice_id, reason, items, notes } = data;
  if (!business_id || !customer_id || !credit_note_date || !reason || !items || items.length === 0) {
    throw new Error('Missing required fields');
  }

  const business = db.businesses.find(b => b.id === Number(business_id));
  const customer = db.customers.find(c => c.id === Number(customer_id));
  if (!business) throw new Error('Business not found');
  if (!customer) throw new Error('Customer not found');

  const isIgst = business.state_code !== customer.state_code;
  const cnNumber = generateCreditNoteNumber(db.credit_notes);

  let subtotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0;

  const processedItems = items.map(item => {
    const amount = round2(item.quantity * item.rate);
    const taxAmount = round2(amount * item.gst_rate / 100);
    let cgst = 0, sgst = 0, igst = 0;
    if (isIgst) { igst = taxAmount; } else { cgst = round2(taxAmount / 2); sgst = round2(taxAmount / 2); }
    subtotal += amount; cgstTotal += cgst; sgstTotal += sgst; igstTotal += igst;
    return { ...item, amount, cgst_amount: cgst, sgst_amount: sgst, igst_amount: igst, total: round2(amount + taxAmount) };
  });

  subtotal = round2(subtotal); cgstTotal = round2(cgstTotal); sgstTotal = round2(sgstTotal); igstTotal = round2(igstTotal);
  const totalTax = round2(cgstTotal + sgstTotal + igstTotal);
  const grandTotal = round2(subtotal + totalTax);
  const amountInWords = numberToWords(grandTotal);

  const cnId = getNextId(db.credit_notes);
  const creditNote = {
    id: cnId, credit_note_number: cnNumber, credit_note_date,
    invoice_id: invoice_id ? Number(invoice_id) : null,
    business_id: Number(business_id), customer_id: Number(customer_id), reason,
    place_of_supply: customer.state, supply_state_code: customer.state_code,
    is_igst: isIgst ? 1 : 0, subtotal, cgst_total: cgstTotal, sgst_total: sgstTotal,
    igst_total: igstTotal, total_tax: totalTax, grand_total: grandTotal,
    amount_in_words: amountInWords, notes: notes || null, status: 'draft',
    created_at: nowISO(), updated_at: nowISO(),
  };

  db.credit_notes.push(creditNote);

  for (const item of processedItems) {
    db.credit_note_items.push({
      id: getNextId(db.credit_note_items),
      credit_note_id: cnId, product_id: item.product_id || null,
      description: item.description, hsn_code: item.hsn_code, unit: item.unit || 'NOS',
      quantity: item.quantity, rate: item.rate, amount: item.amount, gst_rate: item.gst_rate,
      cgst_amount: item.cgst_amount, sgst_amount: item.sgst_amount, igst_amount: item.igst_amount, total: item.total,
    });
  }

  persist();
  return getCreditNote(cnId);
}

export function updateCreditNoteStatus(id, status) {
  if (!['draft', 'sent', 'cancelled'].includes(status)) throw new Error('Invalid status');
  const idx = db.credit_notes.findIndex(c => c.id === Number(id));
  if (idx === -1) throw new Error('Credit note not found');
  db.credit_notes[idx] = { ...db.credit_notes[idx], status, updated_at: nowISO() };
  persist();
  return { ...db.credit_notes[idx] };
}

export function deleteCreditNote(id) {
  const cn = db.credit_notes.find(c => c.id === Number(id));
  if (!cn) throw new Error('Credit note not found');
  if (cn.status === 'sent') throw new Error('Cannot delete a sent credit note');
  db.credit_notes = db.credit_notes.filter(c => c.id !== Number(id));
  db.credit_note_items = db.credit_note_items.filter(it => it.credit_note_id !== Number(id));
  persist();
  return { success: true };
}

// ─── Reports ───

export function getGstr1(from, to) {
  const invoices = db.invoices
    .filter(i => i.invoice_date >= from && i.invoice_date <= to && i.status !== 'cancelled')
    .map(inv => {
      const cust = db.customers.find(c => c.id === inv.customer_id) || {};
      const items = db.invoice_items.filter(it => it.invoice_id === inv.id);
      return { ...inv, customer_name: cust.name, customer_gstin: cust.gstin, customer_state: cust.state, customer_state_code: cust.state_code, items };
    });

  const b2b = invoices.filter(inv => inv.customer_gstin).map(inv => ({
    invoice_number: inv.invoice_number, invoice_date: inv.invoice_date,
    customer_name: inv.customer_name, customer_gstin: inv.customer_gstin, customer_state: inv.customer_state,
    is_igst: inv.is_igst, subtotal: inv.subtotal, cgst_total: inv.cgst_total, sgst_total: inv.sgst_total,
    igst_total: inv.igst_total, total_tax: inv.total_tax, grand_total: inv.grand_total,
  }));

  const b2c = invoices.filter(inv => !inv.customer_gstin).map(inv => ({
    invoice_number: inv.invoice_number, invoice_date: inv.invoice_date,
    customer_name: inv.customer_name, customer_state: inv.customer_state,
    is_igst: inv.is_igst, subtotal: inv.subtotal, cgst_total: inv.cgst_total, sgst_total: inv.sgst_total,
    igst_total: inv.igst_total, total_tax: inv.total_tax, grand_total: inv.grand_total,
  }));

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

  const summary = {
    total_invoices: invoices.length,
    total_taxable: round2(invoices.reduce((s, i) => s + i.subtotal, 0)),
    total_cgst: round2(invoices.reduce((s, i) => s + i.cgst_total, 0)),
    total_sgst: round2(invoices.reduce((s, i) => s + i.sgst_total, 0)),
    total_igst: round2(invoices.reduce((s, i) => s + i.igst_total, 0)),
    total_tax: round2(invoices.reduce((s, i) => s + i.total_tax, 0)),
    grand_total: round2(invoices.reduce((s, i) => s + i.grand_total, 0)),
  };

  return { b2b, b2c, hsn_summary: Object.values(hsnMap), summary };
}

export function getGstr3b(from, to) {
  const invoices = db.invoices.filter(i => i.invoice_date >= from && i.invoice_date <= to && i.status !== 'cancelled');
  const cnData = db.credit_notes.filter(cn => cn.credit_note_date >= from && cn.credit_note_date <= to && cn.status !== 'cancelled');

  const interState = invoices.filter(i => i.is_igst);
  const intraState = invoices.filter(i => !i.is_igst);

  const section_31 = {
    inter_state: { taxable: round2(interState.reduce((s, i) => s + i.subtotal, 0)), igst: round2(interState.reduce((s, i) => s + i.igst_total, 0)) },
    intra_state: { taxable: round2(intraState.reduce((s, i) => s + i.subtotal, 0)), cgst: round2(intraState.reduce((s, i) => s + i.cgst_total, 0)), sgst: round2(intraState.reduce((s, i) => s + i.sgst_total, 0)) },
  };

  const rateMap = {};
  for (const inv of invoices) {
    const items = db.invoice_items.filter(it => it.invoice_id === inv.id);
    for (const item of items) {
      const rate = item.gst_rate;
      if (!rateMap[rate]) rateMap[rate] = { gst_rate: rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, total_tax: 0 };
      rateMap[rate].taxable = round2(rateMap[rate].taxable + item.amount);
      rateMap[rate].cgst = round2(rateMap[rate].cgst + item.cgst_amount);
      rateMap[rate].sgst = round2(rateMap[rate].sgst + item.sgst_amount);
      rateMap[rate].igst = round2(rateMap[rate].igst + item.igst_amount);
      rateMap[rate].total_tax = round2(rateMap[rate].total_tax + item.cgst_amount + item.sgst_amount + item.igst_amount);
    }
  }

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

  return { section_31, tax_by_rate: Object.values(rateMap).sort((a, b) => a.gst_rate - b.gst_rate), credit_notes: cnTotals, totals };
}

// ─── CSV Export ───

export function exportInvoicesCSV(from, to) {
  let invoices = db.invoices.map(inv => {
    const cust = db.customers.find(c => c.id === inv.customer_id) || {};
    return { ...inv, customer_name: cust.name, customer_gstin: cust.gstin, customer_state: cust.state };
  });
  if (from) invoices = invoices.filter(i => i.invoice_date >= from);
  if (to) invoices = invoices.filter(i => i.invoice_date <= to);
  invoices.sort((a, b) => a.invoice_date.localeCompare(b.invoice_date));

  const headers = ['Invoice Number', 'Date', 'Due Date', 'Customer', 'GSTIN', 'State', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax', 'Grand Total', 'Status'];
  const rows = invoices.map(inv => [
    inv.invoice_number, inv.invoice_date, inv.due_date || '', inv.customer_name, inv.customer_gstin || '',
    inv.customer_state, inv.subtotal, inv.cgst_total, inv.sgst_total, inv.igst_total, inv.total_tax, inv.grand_total, inv.status,
  ]);

  return [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
}

export function exportItemsCSV(from, to) {
  let invoices = db.invoices.filter(i => i.status !== 'cancelled');
  if (from) invoices = invoices.filter(i => i.invoice_date >= from);
  if (to) invoices = invoices.filter(i => i.invoice_date <= to);
  invoices.sort((a, b) => a.invoice_date.localeCompare(b.invoice_date));

  const headers = ['Invoice #', 'Date', 'Customer', 'GSTIN', 'Description', 'HSN Code', 'Unit', 'Qty', 'Rate', 'Taxable Value', 'GST%', 'CGST', 'SGST', 'IGST', 'Total'];
  const rows = [];
  for (const inv of invoices) {
    const cust = db.customers.find(c => c.id === inv.customer_id) || {};
    const items = db.invoice_items.filter(it => it.invoice_id === inv.id);
    for (const item of items) {
      rows.push([
        inv.invoice_number, inv.invoice_date, cust.name, cust.gstin || '',
        item.description, item.hsn_code, item.unit, item.quantity, item.rate, item.amount,
        item.gst_rate, item.cgst_amount, item.sgst_amount, item.igst_amount, item.total,
      ]);
    }
  }

  return [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
}

// ─── Invoice HTML (for print) ───

export function getInvoiceHTML(id) {
  const invoice = getInvoice(id);
  const isIgst = invoice.is_igst;

  function fmtCurrency(num) {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  }

  const itemRows = invoice.items.map((item, index) => `
    <tr>
      <td style="text-align:center">${index + 1}</td>
      <td>${item.description}</td>
      <td style="text-align:center">${item.hsn_code}</td>
      <td style="text-align:center">${item.unit}</td>
      <td style="text-align:right">${item.quantity}</td>
      <td style="text-align:right">${fmtCurrency(item.rate)}</td>
      <td style="text-align:right">${fmtCurrency(item.amount)}</td>
      <td style="text-align:center">${item.gst_rate}%</td>
      ${isIgst
        ? `<td style="text-align:right">${fmtCurrency(item.igst_amount)}</td>`
        : `<td style="text-align:right">${fmtCurrency(item.cgst_amount)}</td>
           <td style="text-align:right">${fmtCurrency(item.sgst_amount)}</td>`
      }
      <td style="text-align:right">${fmtCurrency(item.total)}</td>
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
        ${isIgst ? '<th style="width:80px">IGST</th>' : '<th style="width:70px">CGST</th><th style="width:70px">SGST</th>'}
        <th style="width:90px">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    <table class="totals-table">
      <tr><td>Subtotal</td><td style="text-align:right">${fmtCurrency(invoice.subtotal)}</td></tr>
      ${isIgst
        ? `<tr><td>IGST</td><td style="text-align:right">${fmtCurrency(invoice.igst_total)}</td></tr>`
        : `<tr><td>CGST</td><td style="text-align:right">${fmtCurrency(invoice.cgst_total)}</td></tr>
           <tr><td>SGST</td><td style="text-align:right">${fmtCurrency(invoice.sgst_total)}</td></tr>`
      }
      <tr><td>Grand Total</td><td style="text-align:right">${fmtCurrency(invoice.grand_total)}</td></tr>
    </table>
  </div>
  <div class="amount-words"><strong>Amount in Words:</strong> ${invoice.amount_in_words}</div>
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
