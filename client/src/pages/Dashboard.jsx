import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { formatCurrency, formatDate, INVOICE_STATUSES } from '../constants';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="text-gray-500">Loading...</div></div>;
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to GST Invoice Manager</h2>
        <p className="text-gray-500 mb-6">Get started by creating your first invoice</p>
        <Link to="/invoices/new" className="btn-primary">Create Invoice</Link>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Invoices', value: stats.totalInvoices, color: 'bg-blue-500' },
    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), color: 'bg-green-500' },
    { label: 'GST Collected', value: formatCurrency(stats.totalTax), color: 'bg-purple-500' },
    { label: 'Paid', value: stats.paidInvoices, sub: `${stats.pendingInvoices} pending`, color: 'bg-amber-500' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-2">
          <Link to="/invoices/new" className="btn-primary">+ New Invoice</Link>
          <Link to="/credit-notes/new" className="btn-secondary text-sm">+ Credit Note</Link>
          <Link to="/reports" className="btn-secondary text-sm">Reports</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, sub, color }) => (
          <div key={label} className="card">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-sm text-gray-500">{label}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
            {sub && <div className="text-sm text-gray-500 mt-1">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Invoices</h2>
        {stats.recentInvoices.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Invoice #</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3">
                      <Link to={`/invoices/${inv.id}`} className="text-blue-600 hover:underline font-medium">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="py-3">{inv.customer_name}</td>
                    <td className="py-3">{formatDate(inv.invoice_date)}</td>
                    <td className="py-3 font-medium">{formatCurrency(inv.grand_total)}</td>
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
