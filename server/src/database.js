const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'gstinvoice.db');

let db;

function getDb() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema();
    seedDefaultData();
  }
  return db;
}

function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      state_code TEXT NOT NULL,
      pincode TEXT NOT NULL,
      gstin TEXT NOT NULL,
      pan TEXT,
      phone TEXT,
      email TEXT,
      bank_name TEXT,
      bank_account TEXT,
      bank_ifsc TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      state_code TEXT NOT NULL,
      pincode TEXT NOT NULL,
      gstin TEXT,
      pan TEXT,
      phone TEXT,
      email TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      hsn_code TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'NOS',
      rate REAL NOT NULL DEFAULT 0,
      gst_rate REAL NOT NULL DEFAULT 18,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      invoice_date TEXT NOT NULL,
      due_date TEXT,
      business_id INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      place_of_supply TEXT NOT NULL,
      supply_state_code TEXT NOT NULL,
      is_igst INTEGER DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      cgst_total REAL NOT NULL DEFAULT 0,
      sgst_total REAL NOT NULL DEFAULT 0,
      igst_total REAL NOT NULL DEFAULT 0,
      total_tax REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      amount_in_words TEXT,
      notes TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (business_id) REFERENCES businesses(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      product_id INTEGER,
      description TEXT NOT NULL,
      hsn_code TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'NOS',
      quantity REAL NOT NULL,
      rate REAL NOT NULL,
      amount REAL NOT NULL,
      gst_rate REAL NOT NULL,
      cgst_amount REAL NOT NULL DEFAULT 0,
      sgst_amount REAL NOT NULL DEFAULT 0,
      igst_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);
}

function seedDefaultData() {
  const businessCount = db.prepare('SELECT COUNT(*) as count FROM businesses').get();
  if (businessCount.count === 0) {
    db.prepare(`
      INSERT INTO businesses (name, address, city, state, state_code, pincode, gstin, pan, phone, email, bank_name, bank_account, bank_ifsc, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      'Sample Business Pvt. Ltd.',
      '123 Business Park, MG Road',
      'Mumbai',
      'Maharashtra',
      '27',
      '400001',
      '27AABCS1234A1Z5',
      'AABCS1234A',
      '9876543210',
      'info@samplebiz.com',
      'State Bank of India',
      '1234567890123',
      'SBIN0001234'
    );
  }

  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (productCount.count === 0) {
    const insertProduct = db.prepare('INSERT INTO products (name, hsn_code, unit, rate, gst_rate) VALUES (?, ?, ?, ?, ?)');
    const products = [
      ['Web Development Service', '998314', 'NOS', 50000, 18],
      ['Mobile App Development', '998314', 'NOS', 75000, 18],
      ['IT Consulting', '998313', 'HRS', 5000, 18],
      ['Cloud Hosting (Annual)', '998315', 'NOS', 24000, 18],
      ['Laptop', '8471', 'NOS', 55000, 18],
      ['Office Chair', '9401', 'NOS', 8000, 18],
      ['Printer Paper (Ream)', '4802', 'PKT', 350, 12],
      ['Software License', '998316', 'NOS', 15000, 18],
    ];
    const insertMany = db.transaction(() => {
      for (const p of products) {
        insertProduct.run(...p);
      }
    });
    insertMany();
  }
}

module.exports = { getDb };
