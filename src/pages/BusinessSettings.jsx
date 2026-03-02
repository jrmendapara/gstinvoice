import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { INDIAN_STATES } from '../constants';

const emptyForm = {
  name: '', address: '', city: '', state: '', state_code: '',
  pincode: '', gstin: '', pan: '', phone: '', email: '',
  bank_name: '', bank_account: '', bank_ifsc: '', is_default: true,
};

export default function BusinessSettings() {
  const [form, setForm] = useState({ ...emptyForm });
  const [businessId, setBusinessId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getDefaultBusiness()
      .then((b) => {
        setBusinessId(b.id);
        setForm({
          name: b.name, address: b.address, city: b.city, state: b.state,
          state_code: b.state_code, pincode: b.pincode, gstin: b.gstin,
          pan: b.pan || '', phone: b.phone || '', email: b.email || '',
          bank_name: b.bank_name || '', bank_account: b.bank_account || '',
          bank_ifsc: b.bank_ifsc || '', is_default: true,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleStateChange(code) {
    const state = INDIAN_STATES.find((s) => s.code === code);
    setForm((f) => ({ ...f, state: state?.name || '', state_code: code }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (businessId) {
        await api.updateBusiness(businessId, form);
        toast.success('Business details updated');
      } else {
        const b = await api.createBusiness(form);
        setBusinessId(b.id);
        toast.success('Business details saved');
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Business Settings</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Business Name *</label>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Pincode *</label>
                <input type="text" className="input-field" value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} required maxLength={6} />
              </div>
              <div>
                <label className="label">GSTIN *</label>
                <input type="text" className="input-field" value={form.gstin} onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value.toUpperCase() }))} required maxLength={15} />
              </div>
              <div>
                <label className="label">PAN</label>
                <input type="text" className="input-field" value={form.pan} onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))} maxLength={10} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h2>
          <div className="space-y-4">
            <div>
              <label className="label">Bank Name</label>
              <input type="text" className="input-field" value={form.bank_name} onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Account Number</label>
                <input type="text" className="input-field" value={form.bank_account} onChange={(e) => setForm((f) => ({ ...f, bank_account: e.target.value }))} />
              </div>
              <div>
                <label className="label">IFSC Code</label>
                <input type="text" className="input-field" value={form.bank_ifsc} onChange={(e) => setForm((f) => ({ ...f, bank_ifsc: e.target.value.toUpperCase() }))} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
