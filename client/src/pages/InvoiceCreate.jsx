import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { GST_RATES, UNITS, formatCurrency } from '../constants';

const emptyItem = { description: '', hsn_code: '', unit: 'NOS', quantity: 1, rate: 0, gst_rate: 18, product_id: null };

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    notes: '',
    items: [{ ...emptyItem }],
  });

  useEffect(() => {
    Promise.all([
      api.getCustomers(),
      api.getProducts(),
      api.getDefaultBusiness(),
    ])
      .then(([c, p, b]) => {
        setCustomers(c);
        setProducts(p);
        setBusiness(b);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  function addItem() {
    setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  }

  function removeItem(index) {
    if (form.items.length <= 1) return;
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  }

  function updateItem(index, field, value) {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index], [field]: value };
      return { ...f, items };
    });
  }

  function selectProduct(index, productId) {
    const product = products.find((p) => p.id === Number(productId));
    if (product) {
      setForm((f) => {
        const items = [...f.items];
        items[index] = {
          ...items[index],
          product_id: product.id,
          description: product.name,
          hsn_code: product.hsn_code,
          unit: product.unit,
          rate: product.rate,
          gst_rate: product.gst_rate,
        };
        return { ...f, items };
      });
    }
  }

  function calculateTotals() {
    const selectedCustomer = customers.find((c) => c.id === Number(form.customer_id));
    const isIgst = business && selectedCustomer && business.state_code !== selectedCustomer.state_code;

    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    for (const item of form.items) {
      const amount = item.quantity * item.rate;
      const tax = amount * item.gst_rate / 100;
      subtotal += amount;
      if (isIgst) {
        igst += tax;
      } else {
        cgst += tax / 2;
        sgst += tax / 2;
      }
    }

    return { subtotal, cgst, sgst, igst, total: subtotal + cgst + sgst + igst, isIgst };
  }

  async function handleSubmit(e, status = 'draft') {
    e.preventDefault();
    if (!form.customer_id) { toast.error('Please select a customer'); return; }
    if (!form.items.some((i) => i.description && i.rate > 0)) { toast.error('Add at least one valid item'); return; }

    setSubmitting(true);
    try {
      const invoice = await api.createInvoice({
        business_id: business.id,
        customer_id: Number(form.customer_id),
        invoice_date: form.invoice_date,
        due_date: form.due_date || null,
        notes: form.notes,
        status,
        items: form.items.filter((i) => i.description && i.rate > 0).map((i) => ({
          product_id: i.product_id,
          description: i.description,
          hsn_code: i.hsn_code,
          unit: i.unit,
          quantity: Number(i.quantity),
          rate: Number(i.rate),
          gst_rate: Number(i.gst_rate),
        })),
      });
      toast.success('Invoice created successfully');
      navigate(`/invoices/${invoice.id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;

  const totals = calculateTotals();

  return (
    <div>
      <Link to="/invoices" className="text-sm text-gray-500 hover:text-gray-700 mb-2 block">&larr; Back to Invoices</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Invoice</h1>

      <form onSubmit={(e) => handleSubmit(e)}>
        <div className="card mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Customer *</label>
              <select
                className="input-field"
                value={form.customer_id}
                onChange={(e) => setForm((f) => ({ ...f, customer_id: e.target.value }))}
                required
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.gstin ? `(${c.gstin})` : ''}</option>
                ))}
              </select>
              <Link to="/customers/new" className="text-xs text-blue-600 hover:underline mt-1 inline-block">+ Add New Customer</Link>
            </div>
            <div>
              <label className="label">Invoice Date *</label>
              <input
                type="date"
                className="input-field"
                value={form.invoice_date}
                onChange={(e) => setForm((f) => ({ ...f, invoice_date: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                className="input-field"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
            <button type="button" onClick={addItem} className="btn-secondary text-sm">+ Add Item</button>
          </div>

          <div className="space-y-4">
            {form.items.map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div className="md:col-span-2">
                    <label className="label">Product (optional)</label>
                    <select
                      className="input-field text-sm"
                      onChange={(e) => selectProduct(index, e.target.value)}
                      value={item.product_id || ''}
                    >
                      <option value="">-- Select or type below --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.hsn_code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">Description *</label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">HSN Code *</label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      value={item.hsn_code}
                      onChange={(e) => updateItem(index, 'hsn_code', e.target.value)}
                      placeholder="HSN"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Unit</label>
                    <select
                      className="input-field text-sm"
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    >
                      {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 items-end">
                  <div>
                    <label className="label">Quantity</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="input-field text-sm"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Rate (INR)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-field text-sm"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">GST Rate</label>
                    <select
                      className="input-field text-sm"
                      value={item.gst_rate}
                      onChange={(e) => updateItem(index, 'gst_rate', Number(e.target.value))}
                    >
                      {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Amount</label>
                    <div className="input-field text-sm bg-gray-100 text-gray-700">
                      {formatCurrency(item.quantity * item.rate)}
                    </div>
                  </div>
                  <div>
                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
            <textarea
              className="input-field"
              rows={3}
              placeholder="Any additional notes..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              {totals.isIgst ? (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IGST</span>
                  <span className="font-medium">{formatCurrency(totals.igst)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">CGST</span>
                    <span className="font-medium">{formatCurrency(totals.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">SGST</span>
                    <span className="font-medium">{formatCurrency(totals.sgst)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between pt-2 border-t text-lg font-bold">
                <span>Grand Total</span>
                <span className="text-blue-600">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/invoices')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Creating...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={(e) => handleSubmit(e, 'sent')}
            className="btn-success"
          >
            Save & Send
          </button>
        </div>
      </form>
    </div>
  );
}
