import * as store from './lib/store';

function wrap(fn) {
  try {
    return Promise.resolve(fn());
  } catch (e) {
    return Promise.reject(e);
  }
}

export const api = {
  // Dashboard
  getDashboard: () => wrap(() => store.getDashboard()),

  // Businesses
  getBusinesses: () => wrap(() => store.getBusinesses()),
  getDefaultBusiness: () => wrap(() => store.getDefaultBusiness()),
  getBusiness: (id) => wrap(() => store.getBusiness(id)),
  createBusiness: (data) => wrap(() => store.createBusiness(data)),
  updateBusiness: (id, data) => wrap(() => store.updateBusiness(id, data)),
  deleteBusiness: (id) => wrap(() => store.deleteBusiness(id)),

  // Customers
  getCustomers: (search) => wrap(() => store.getCustomers(search)),
  getCustomer: (id) => wrap(() => store.getCustomer(id)),
  createCustomer: (data) => wrap(() => store.createCustomer(data)),
  updateCustomer: (id, data) => wrap(() => store.updateCustomer(id, data)),
  deleteCustomer: (id) => wrap(() => store.deleteCustomer(id)),

  // Products
  getProducts: (search) => wrap(() => store.getProducts(search)),
  getProduct: (id) => wrap(() => store.getProduct(id)),
  createProduct: (data) => wrap(() => store.createProduct(data)),
  updateProduct: (id, data) => wrap(() => store.updateProduct(id, data)),
  deleteProduct: (id) => wrap(() => store.deleteProduct(id)),

  // Invoices
  getInvoices: (params) => wrap(() => store.getInvoices(params)),
  getInvoice: (id) => wrap(() => store.getInvoice(id)),
  getNextInvoiceNumber: () => wrap(() => store.getNextInvoiceNumber()),
  createInvoice: (data) => wrap(() => store.createInvoice(data)),
  updateInvoice: (id, data) => wrap(() => store.updateInvoice(id, data)),
  updateInvoiceStatus: (id, status) => wrap(() => store.updateInvoiceStatus(id, status)),
  deleteInvoice: (id) => wrap(() => store.deleteInvoice(id)),

  // Reports
  getGstr1: (from, to) => wrap(() => store.getGstr1(from, to)),
  getGstr3b: (from, to) => wrap(() => store.getGstr3b(from, to)),

  // Credit Notes
  getCreditNotes: (params) => wrap(() => store.getCreditNotes(params)),
  getCreditNote: (id) => wrap(() => store.getCreditNote(id)),
  createCreditNote: (data) => wrap(() => store.createCreditNote(data)),
  updateCreditNoteStatus: (id, status) => wrap(() => store.updateCreditNoteStatus(id, status)),
  deleteCreditNote: (id) => wrap(() => store.deleteCreditNote(id)),

  // Export helpers (client-side)
  getInvoiceHTML: (id) => store.getInvoiceHTML(id),
  exportInvoicesCSV: (from, to) => store.exportInvoicesCSV(from, to),
  exportItemsCSV: (from, to) => store.exportItemsCSV(from, to),
};
