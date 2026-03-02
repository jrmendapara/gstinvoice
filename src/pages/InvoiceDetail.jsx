import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { formatCurrency, formatDate, INVOICE_STATUSES } from '../constants';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getInvoice(id)
      .then(setInvoice)
      .catch(() => {
        toast.error('Invoice not found');
        navigate('/invoices');
      })
      .finally(() => setLoading(false));
  }, [id]);

  function handleStatusChange(status) {
    api.updateInvoiceStatus(id, status)
      .then((updated) => {
        setInvoice((prev) => ({ ...prev, ...updated }));
        toast.success(`Invoice marked as ${status}`);
      })
      .catch((err) => toast.error(err.message));
  }

  function handleDelete() {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    api.deleteInvoice(id)
      .then(() => {
        toast.success('Invoice deleted');
        navigate('/invoices');
      })
      .catch((err) => toast.error(err.message));
  }

  function handlePrint() {
    const html = api.getInvoiceHTML(id);
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (!invoice) return null;

  const isIgst = invoice.is_igst;

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link to="/invoices" className="text-sm text-gray-500 hover:text-gray-700 mb-2 block">&larr; Back to Invoices</Link>
          <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-secondary text-sm">Print / PDF</button>
          {invoice.status === 'draft' && (
            <Link to={`/invoices/${id}/edit`} className="btn-secondary text-sm">Edit</Link>
          )}
          {invoice.status === 'draft' && (
            <button onClick={() => handleStatusChange('sent')} className="btn-primary text-sm">Mark Sent</button>
          )}
          {(invoice.status === 'draft' || invoice.status === 'sent') && (
            <button onClick={() => handleStatusChange('paid')} className="btn-success text-sm">Mark Paid</button>
          )}
          {invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
            <button onClick={() => handleStatusChange('cancelled')} className="btn-danger text-sm">Cancel</button>
          )}
          {invoice.status !== 'paid' && (
            <button onClick={handleDelete} className="text-red-600 hover:text-red-700 text-sm px-2">Delete</button>
          )}
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${INVOICE_STATUSES[invoice.status]?.color}`}>
              {INVOICE_STATUSES[invoice.status]?.label}
            </span>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Date: <span className="font-medium text-gray-900">{formatDate(invoice.invoice_date)}</span></p>
            {invoice.due_date && <p>Due: <span className="font-medium text-gray-900">{formatDate(invoice.due_date)}</span></p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">From</h3>
            <p className="font-semibold text-gray-900">{invoice.business_name}</p>
            <p className="text-sm text-gray-600">{invoice.business_address}</p>
            <p className="text-sm text-gray-600">{invoice.business_city}, {invoice.business_state} - {invoice.business_pincode}</p>
            <p className="text-sm text-gray-600 mt-1">GSTIN: {invoice.business_gstin}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Bill To</h3>
            <p className="font-semibold text-gray-900">{invoice.customer_name}</p>
            <p className="text-sm text-gray-600">{invoice.customer_address}</p>
            <p className="text-sm text-gray-600">{invoice.customer_city}, {invoice.customer_state} - {invoice.customer_pincode}</p>
            {invoice.customer_gstin && <p className="text-sm text-gray-600 mt-1">GSTIN: {invoice.customer_gstin}</p>}
          </div>
        </div>

        <div className="overflow-x-auto mb-6">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b bg-gray-50">
                <th className="p-3 font-medium">#</th>
                <th className="p-3 font-medium">Description</th>
                <th className="p-3 font-medium">HSN</th>
                <th className="p-3 font-medium text-right">Qty</th>
                <th className="p-3 font-medium text-right">Rate</th>
                <th className="p-3 font-medium text-right">Amount</th>
                <th className="p-3 font-medium text-center">GST%</th>
                {isIgst ? (
                  <th className="p-3 font-medium text-right">IGST</th>
                ) : (
                  <>
                    <th className="p-3 font-medium text-right">CGST</th>
                    <th className="p-3 font-medium text-right">SGST</th>
                  </>
                )}
                <th className="p-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item, i) => (
                <tr key={item.id} className="border-b">
                  <td className="p-3">{i + 1}</td>
                  <td className="p-3 font-medium">{item.description}</td>
                  <td className="p-3">{item.hsn_code}</td>
                  <td className="p-3 text-right">{item.quantity} {item.unit}</td>
                  <td className="p-3 text-right">{formatCurrency(item.rate)}</td>
                  <td className="p-3 text-right">{formatCurrency(item.amount)}</td>
                  <td className="p-3 text-center">{item.gst_rate}%</td>
                  {isIgst ? (
                    <td className="p-3 text-right">{formatCurrency(item.igst_amount)}</td>
                  ) : (
                    <>
                      <td className="p-3 text-right">{formatCurrency(item.cgst_amount)}</td>
                      <td className="p-3 text-right">{formatCurrency(item.sgst_amount)}</td>
                    </>
                  )}
                  <td className="p-3 text-right font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="w-72">
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {isIgst ? (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-500">IGST</span>
                <span className="font-medium">{formatCurrency(invoice.igst_total)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-500">CGST</span>
                  <span className="font-medium">{formatCurrency(invoice.cgst_total)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-500">SGST</span>
                  <span className="font-medium">{formatCurrency(invoice.sgst_total)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between py-3 border-t border-gray-300 text-lg font-bold">
              <span>Grand Total</span>
              <span className="text-blue-600">{formatCurrency(invoice.grand_total)}</span>
            </div>
          </div>
        </div>

        {invoice.amount_in_words && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
            <span className="font-medium">Amount in Words: </span>
            <span className="italic">{invoice.amount_in_words}</span>
          </div>
        )}

        {invoice.notes && (
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">Notes: </span>{invoice.notes}
          </div>
        )}

        {(invoice.bank_name || invoice.bank_account) && (
          <div className="mt-6 pt-4 border-t text-sm">
            <h3 className="font-semibold text-gray-700 mb-2">Bank Details</h3>
            {invoice.bank_name && <p>Bank: {invoice.bank_name}</p>}
            {invoice.bank_account && <p>Account: {invoice.bank_account}</p>}
            {invoice.bank_ifsc && <p>IFSC: {invoice.bank_ifsc}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
