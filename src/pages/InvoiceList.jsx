import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatCurrency, formatDate, INVOICE_STATUSES } from '../constants';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadInvoices();
  }, [statusFilter, search]);

  function loadInvoices() {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.getInvoices(params)
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <Link to="/invoices/new" className="btn-primary">+ New Invoice</Link>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by invoice # or customer..."
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
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">No invoices found</p>
            <Link to="/invoices/new" className="btn-primary">Create your first invoice</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Invoice #</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Subtotal</th>
                  <th className="pb-3 font-medium">Tax</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3">
                      <Link to={`/invoices/${inv.id}`} className="text-blue-600 hover:underline font-medium">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3">{inv.customer_name}</td>
                    <td className="py-3">{formatDate(inv.invoice_date)}</td>
                    <td className="py-3">{formatCurrency(inv.subtotal)}</td>
                    <td className="py-3">{formatCurrency(inv.total_tax)}</td>
                    <td className="py-3 font-semibold">{formatCurrency(inv.grand_total)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${INVOICE_STATUSES[inv.status]?.color}`}>
                        {INVOICE_STATUSES[inv.status]?.label}
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
