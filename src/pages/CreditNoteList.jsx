import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatCurrency, formatDate, INVOICE_STATUSES } from '../constants';

const CN_STATUSES = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export default function CreditNoteList() {
  const [creditNotes, setCreditNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadCreditNotes();
  }, [statusFilter, search]);

  function loadCreditNotes() {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.getCreditNotes(params)
      .then(setCreditNotes)
      .catch(() => setCreditNotes([]))
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Credit Notes</h1>
        <Link to="/credit-notes/new" className="btn-primary">+ New Credit Note</Link>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by CN # or customer..."
            className="input-field flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input-field w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading...</div>
        ) : creditNotes.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">No credit notes found</p>
            <Link to="/credit-notes/new" className="btn-primary">Create your first credit note</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">CN #</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Original Invoice</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Reason</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {creditNotes.map((cn) => (
                  <tr key={cn.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3">
                      <Link to={`/credit-notes/${cn.id}`} className="text-blue-600 hover:underline font-medium">
                        {cn.credit_note_number}
                      </Link>
                    </td>
                    <td className="py-3">{cn.customer_name}</td>
                    <td className="py-3">{cn.original_invoice || '-'}</td>
                    <td className="py-3">{formatDate(cn.credit_note_date)}</td>
                    <td className="py-3 text-sm">{cn.reason}</td>
                    <td className="py-3 font-semibold text-right">{formatCurrency(cn.grand_total)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${CN_STATUSES[cn.status]?.color}`}>
                        {CN_STATUSES[cn.status]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
