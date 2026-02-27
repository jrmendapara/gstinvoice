import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api';
import { formatCurrency, formatDate } from '../constants';

function getFinancialYearDates() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: `${year}-04-01`, to: `${year + 1}-03-31` };
}

function getMonthDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
  return { from, to };
}

export default function Reports() {
  const monthDates = getMonthDates();
  const [from, setFrom] = useState(monthDates.from);
  const [to, setTo] = useState(monthDates.to);
  const [activeTab, setActiveTab] = useState('gstr1');
  const [gstr1, setGstr1] = useState(null);
  const [gstr3b, setGstr3b] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    setLoading(true);
    try {
      if (activeTab === 'gstr1') {
        const data = await api.getGstr1(from, to);
        setGstr1(data);
      } else {
        const data = await api.getGstr3b(from, to);
        setGstr3b(data);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function setQuickRange(type) {
    if (type === 'month') {
      const dates = getMonthDates();
      setFrom(dates.from);
      setTo(dates.to);
    } else if (type === 'quarter') {
      const now = new Date();
      const month = now.getMonth();
      const year = now.getFullYear();
      const qStart = month < 3 ? 0 : month < 6 ? 3 : month < 9 ? 6 : 9;
      const qYear = qStart === 0 && month < 3 ? year : year;
      setFrom(`${qYear}-${String(qStart + 1).padStart(2, '0')}-01`);
      const qEndMonth = qStart + 3;
      const qEndYear = qEndMonth > 12 ? qYear + 1 : qYear;
      const actualEndMonth = qEndMonth > 12 ? qEndMonth - 12 : qEndMonth;
      const lastDay = new Date(qEndYear, actualEndMonth, 0).getDate();
      setTo(`${qEndYear}-${String(actualEndMonth).padStart(2, '0')}-${lastDay}`);
    } else if (type === 'fy') {
      const dates = getFinancialYearDates();
      setFrom(dates.from);
      setTo(dates.to);
    }
  }

  function exportCSV(type) {
    const url = `/api/reports/export/${type}?from=${from}&to=${to}`;
    window.open(url, '_blank');
  }

  const tabs = [
    { id: 'gstr1', label: 'GSTR-1' },
    { id: 'gstr3b', label: 'GSTR-3B' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">GST Reports</h1>

      {/* Date Range & Controls */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label className="label">From Date</label>
            <input type="date" className="input-field" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To Date</label>
            <input type="date" className="input-field" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setQuickRange('month')} className="btn-secondary text-xs">This Month</button>
            <button onClick={() => setQuickRange('quarter')} className="btn-secondary text-xs">This Quarter</button>
            <button onClick={() => setQuickRange('fy')} className="btn-secondary text-xs">This FY</button>
          </div>
          <button onClick={loadReport} disabled={loading} className="btn-primary">
            {loading ? 'Loading...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* GSTR-1 Report */}
      {activeTab === 'gstr1' && gstr1 && (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card text-center">
              <p className="text-sm text-gray-500">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{gstr1.summary.total_invoices}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Taxable Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(gstr1.summary.total_taxable)}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Total Tax</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(gstr1.summary.total_tax)}</p>
            </div>
            <div className="card text-center">
              <p className="text-sm text-gray-500">Grand Total</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(gstr1.summary.grand_total)}</p>
            </div>
          </div>

          {/* B2B Invoices */}
          {gstr1.b2b.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">B2B Invoices (Registered Dealers)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b bg-gray-50">
                      <th className="p-3 font-medium">Invoice #</th>
                      <th className="p-3 font-medium">Date</th>
                      <th className="p-3 font-medium">Customer</th>
                      <th className="p-3 font-medium">GSTIN</th>
                      <th className="p-3 font-medium text-right">Taxable</th>
                      <th className="p-3 font-medium text-right">CGST</th>
                      <th className="p-3 font-medium text-right">SGST</th>
                      <th className="p-3 font-medium text-right">IGST</th>
                      <th className="p-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstr1.b2b.map((inv, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-3 font-medium">{inv.invoice_number}</td>
                        <td className="p-3">{formatDate(inv.invoice_date)}</td>
                        <td className="p-3">{inv.customer_name}</td>
                        <td className="p-3">{inv.customer_gstin}</td>
                        <td className="p-3 text-right">{formatCurrency(inv.subtotal)}</td>
                        <td className="p-3 text-right">{formatCurrency(inv.cgst_total)}</td>
                        <td className="p-3 text-right">{formatCurrency(inv.sgst_total)}</td>
                        <td className="p-3 text-right">{formatCurrency(inv.igst_total)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(inv.grand_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* B2C Invoices */}
          {gstr1.b2c.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">B2C Invoices (Unregistered Dealers)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b bg-gray-50">
                      <th className="p-3 font-medium">Invoice #</th>
                      <th className="p-3 font-medium">Date</th>
                      <th className="p-3 font-medium">Customer</th>
                      <th className="p-3 font-medium">State</th>
                      <th className="p-3 font-medium text-right">Taxable</th>
                      <th className="p-3 font-medium text-right">Tax</th>
                      <th className="p-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstr1.b2c.map((inv, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-3 font-medium">{inv.invoice_number}</td>
                        <td className="p-3">{formatDate(inv.invoice_date)}</td>
                        <td className="p-3">{inv.customer_name}</td>
                        <td className="p-3">{inv.customer_state}</td>
                        <td className="p-3 text-right">{formatCurrency(inv.subtotal)}</td>
                        <td className="p-3 text-right">{formatCurrency(inv.total_tax)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(inv.grand_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HSN Summary */}
          {gstr1.hsn_summary.length > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">HSN-wise Summary</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b bg-gray-50">
                      <th className="p-3 font-medium">HSN Code</th>
                      <th className="p-3 font-medium">Description</th>
                      <th className="p-3 font-medium text-center">GST%</th>
                      <th className="p-3 font-medium text-right">Qty</th>
                      <th className="p-3 font-medium text-right">Taxable</th>
                      <th className="p-3 font-medium text-right">CGST</th>
                      <th className="p-3 font-medium text-right">SGST</th>
                      <th className="p-3 font-medium text-right">IGST</th>
                      <th className="p-3 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gstr1.hsn_summary.map((hsn, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-3 font-medium">{hsn.hsn_code}</td>
                        <td className="p-3">{hsn.description}</td>
                        <td className="p-3 text-center">{hsn.gst_rate}%</td>
                        <td className="p-3 text-right">{hsn.quantity}</td>
                        <td className="p-3 text-right">{formatCurrency(hsn.taxable_value)}</td>
                        <td className="p-3 text-right">{formatCurrency(hsn.cgst)}</td>
                        <td className="p-3 text-right">{formatCurrency(hsn.sgst)}</td>
                        <td className="p-3 text-right">{formatCurrency(hsn.igst)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(hsn.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Export Buttons */}
          <div className="flex gap-3">
            <button onClick={() => exportCSV('invoices')} className="btn-secondary">Export Invoices CSV</button>
            <button onClick={() => exportCSV('items')} className="btn-secondary">Export Items CSV</button>
          </div>
        </div>
      )}

      {/* GSTR-3B Report */}
      {activeTab === 'gstr3b' && gstr3b && (
        <div>
          {/* 3.1 Outward Supplies */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">3.1 - Details of Outward Supplies</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50">
                    <th className="p-3 font-medium">Nature of Supplies</th>
                    <th className="p-3 font-medium text-right">Taxable Value</th>
                    <th className="p-3 font-medium text-right">CGST</th>
                    <th className="p-3 font-medium text-right">SGST</th>
                    <th className="p-3 font-medium text-right">IGST</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Inter-State Supplies</td>
                    <td className="p-3 text-right">{formatCurrency(gstr3b.section_31.inter_state.taxable)}</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">-</td>
                    <td className="p-3 text-right">{formatCurrency(gstr3b.section_31.inter_state.igst)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-3 font-medium">Intra-State Supplies</td>
                    <td className="p-3 text-right">{formatCurrency(gstr3b.section_31.intra_state.taxable)}</td>
                    <td className="p-3 text-right">{formatCurrency(gstr3b.section_31.intra_state.cgst)}</td>
                    <td className="p-3 text-right">{formatCurrency(gstr3b.section_31.intra_state.sgst)}</td>
                    <td className="p-3 text-right">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax Breakdown by Rate */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Liability by GST Rate</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b bg-gray-50">
                    <th className="p-3 font-medium">GST Rate</th>
                    <th className="p-3 font-medium text-right">Taxable Value</th>
                    <th className="p-3 font-medium text-right">CGST</th>
                    <th className="p-3 font-medium text-right">SGST</th>
                    <th className="p-3 font-medium text-right">IGST</th>
                    <th className="p-3 font-medium text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {gstr3b.tax_by_rate.map((row, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3 font-medium">{row.gst_rate}%</td>
                      <td className="p-3 text-right">{formatCurrency(row.taxable)}</td>
                      <td className="p-3 text-right">{formatCurrency(row.cgst)}</td>
                      <td className="p-3 text-right">{formatCurrency(row.sgst)}</td>
                      <td className="p-3 text-right">{formatCurrency(row.igst)}</td>
                      <td className="p-3 text-right font-medium">{formatCurrency(row.total_tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Credit Notes */}
          {gstr3b.credit_notes.count > 0 && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Credit/Debit Notes</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div><p className="text-xs text-gray-500">Count</p><p className="font-semibold">{gstr3b.credit_notes.count}</p></div>
                <div><p className="text-xs text-gray-500">Taxable</p><p className="font-semibold">{formatCurrency(gstr3b.credit_notes.taxable)}</p></div>
                <div><p className="text-xs text-gray-500">CGST</p><p className="font-semibold">{formatCurrency(gstr3b.credit_notes.cgst)}</p></div>
                <div><p className="text-xs text-gray-500">SGST</p><p className="font-semibold">{formatCurrency(gstr3b.credit_notes.sgst)}</p></div>
                <div><p className="text-xs text-gray-500">IGST</p><p className="font-semibold">{formatCurrency(gstr3b.credit_notes.igst)}</p></div>
              </div>
            </div>
          )}

          {/* Tax Payable Summary */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tax Payable Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total CGST</p>
                <p className="text-xl font-bold">{formatCurrency(gstr3b.totals.total_cgst)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total SGST</p>
                <p className="text-xl font-bold">{formatCurrency(gstr3b.totals.total_sgst)}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total IGST</p>
                <p className="text-xl font-bold">{formatCurrency(gstr3b.totals.total_igst)}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Net Tax Payable</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(gstr3b.totals.net_tax)}</p>
              </div>
            </div>
          </div>

          {/* Export */}
          <div className="flex gap-3">
            <button onClick={() => exportCSV('invoices')} className="btn-secondary">Export Invoices CSV</button>
            <button onClick={() => exportCSV('items')} className="btn-secondary">Export Items CSV</button>
          </div>
        </div>
      )}

      {!gstr1 && !gstr3b && !loading && (
        <div className="card text-center py-10">
          <p className="text-gray-500">Select a date range and click "Generate Report" to view GST reports.</p>
        </div>
      )}
    </div>
  );
}
