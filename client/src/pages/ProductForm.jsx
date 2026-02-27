import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { GST_RATES, UNITS } from '../constants';

const emptyForm = { name: '', hsn_code: '', unit: 'NOS', rate: 0, gst_rate: 18 };

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.getProduct(id)
        .then((p) => setForm({ name: p.name, hsn_code: p.hsn_code, unit: p.unit, rate: p.rate, gst_rate: p.gst_rate }))
        .catch(() => { toast.error('Product not found'); navigate('/products'); })
        .finally(() => setLoading(false));
    }
  }, [id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = { ...form, rate: Number(form.rate), gst_rate: Number(form.gst_rate) };
      if (isEdit) {
        await api.updateProduct(id, data);
        toast.success('Product updated');
      } else {
        await api.createProduct(data);
        toast.success('Product created');
      }
      navigate('/products');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;

  return (
    <div>
      <Link to="/products" className="text-sm text-gray-500 hover:text-gray-700 mb-2 block">&larr; Back to Products</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Product' : 'Add Product'}</h1>

      <form onSubmit={handleSubmit} className="card max-w-xl">
        <div className="space-y-4">
          <div>
            <label className="label">Product / Service Name *</label>
            <input type="text" className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">HSN / SAC Code *</label>
              <input type="text" className="input-field" value={form.hsn_code} onChange={(e) => setForm((f) => ({ ...f, hsn_code: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input-field" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Default Rate (INR)</label>
              <input type="number" step="0.01" min="0" className="input-field" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} />
            </div>
            <div>
              <label className="label">GST Rate</label>
              <select className="input-field" value={form.gst_rate} onChange={(e) => setForm((f) => ({ ...f, gst_rate: Number(e.target.value) }))}>
                {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => navigate('/products')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : (isEdit ? 'Update Product' : 'Create Product')}</button>
        </div>
      </form>
    </div>
  );
}
