import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { INDIAN_STATES } from '../constants';

const emptyForm = {
  name: '', address: '', city: '', state: '', state_code: '',
  pincode: '', gstin: '', pan: '', phone: '', email: '',
};

export default function CustomerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit) {
      api.getCustomer(id)
        .then((c) => setForm({
          name: c.name, address: c.address, city: c.city, state: c.state,
          state_code: c.state_code, pincode: c.pincode, gstin: c.gstin || '',
          pan: c.pan || '', phone: c.phone || '', email: c.email || '',
        }))
        .catch(() => { toast.error('Customer not found'); navigate('/customers'); })
        .finally(() => setLoading(false));
    }
  }, [id]);

  function handleStateChange(code) {
    const state = INDIAN_STATES.find((s) => s.code === code);
    setForm((f) => ({ ...f, state: state?.name || '', state_code: code }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.updateCustomer(id, form);
        toast.success('Customer updated');
      } else {
        await api.createCustomer(form);
        toast.success('Customer created');
      }
      navigate('/customers');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;

  return (
    <div>
      <Link to="/customers" className="text-sm text-gray-500 hover:text-gray-700 mb-2 block">&larr; Back to Customers</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit Customer' : 'Add Customer'}</h1>

      <form onSubmit={handleSubmit} className="card max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="label">Company / Customer Name *</label>
            <input type="text" className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Address *</label>
            <input type="text" className="input-field" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">City *</label>
              <input type="text" className="input-field" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} required />
            </div>
            <div>
              <label className="label">State *</label>
              <select className="input-field" value={form.state_code} onChange={(e) => handleStateChange(e.target.value)} required>
                <option value="">Select State</option>
                {INDIAN_STATES.map((s) => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Pincode *</label>
              <input type="text" className="input-field" value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} required maxLength={6} />
            </div>
            <div>
              <label className="label">GSTIN</label>
              <input type="text" className="input-field" value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))} maxLength={15} placeholder="e.g. 27AABCS1234A1Z5" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">PAN</label>
              <input type="text" className="input-field" value={form.pan} onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))} maxLength={10} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input type="text" className="input-field" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => navigate('/customers')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : (isEdit ? 'Update Customer' : 'Create Customer')}</button>
        </div>
      </form>
    </div>
  );
}
