import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { formatCurrency, formatDate } from '../constants';

const CN_STATUSES = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export default function CreditNoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cn, setCn] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCreditNote(id)
      .then(setCn)
      .catch(() => {
        toast.error('Credit note not found');
        navigate('/credit-notes');
      })
      .finally(() => setLoading(false));
  }, [id]);

  function handleStatusChange(status) {
    api.updateCreditNoteStatus(id, status)
      .then((updated) => {
        setCn((prev) => ({ ...prev, ...updated }));
        toast.success(`Credit note marked as ${status}`);
      })
      .catch((err) => toast.error(err.message));
  }

  function handleDelete() {
    if (!confirm('Are you sure you want to delete this credit note?')) return;
    api.deleteCreditNote(id)
      .then(() => {
        toast.success('Credit note deleted');
        navigate('/credit-notes');
      })
      .catch((err) => toast.error(err.message));
  }

  if (loading) return <div className="text-center py-20 text-gray-500">Loading...</div>;
  if (!cn) return null;

  const isIgst = cn.is_igst;

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <Link to="/credit-notes" className="text-sm text-gray-500 hover:text-gray-700 mb-2 block">&larr; Back to Credit Notes</Link>
          <h1 className="text-2xl font-bold text-gray-900">{cn.credit_note_number}</h1>
          {cn.original_invoice && (
            <p className="text-sm text-gray-500 mt-1">Against Invoice: <span className="font-medium">{cn.original_invoice}</span></p>
          )}
        </div>
        <div className="flex gap-2">
          {cn.status === 'draft' && (
            <button onClick={() => handleStatusChange('sent')} className="btn-primary text-sm">Mark Sent</button>
          )}
          {cn.status !== 'cancelled' && cn.status !== 'sent' && (
            <button onClick={() => handleStatusChange('cancelled')} className="btn-danger text-sm">Cancel</button>
          )}
          {cn.status === 'draft' && (
            <button onClick={handleDelete} className="text-red-600 hover:text-red-700 text-sm px-2">Delete</button>
          )}
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${CN_STATUSES[cn.status]?.color}`}>
              {CN_STATUSES[cn.status]?.label}
            </span>
            <p className="mt-2 text-sm"><span className="font-medium text-gray-500">Reason:</span> {cn.reason}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>Date: <span className="font-medium text-gray-900">{formatDate(cn.credit_note_date)}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">From</h3>
            <p className="font-semibold text-gray-900">{cn.business_name}</p>
            <p className="text-sm text-gray-600">{cn.business_address}</p>
            <p className="text-sm text-gray-600">{cn.business_city}, {cn.business_state} - {cn.business_pincode}</p>
            <p className="text-sm text-gray-600 mt-1">GSTIN: {cn.business_gstin}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Credit To</h3>
            <p className="font-semibold text-gray-900">{cn.customer_name}</p>
            <p className="text-sm text-gray-600">{cn.customer_address}</p>
            <p className="text-sm text-gray-600">{cn.customer_city}, {cn.customer_state} - {cn.customer_pincode}</p>
            {cn.customer_gstin && <p className="text-sm text-gray-600 mt-1">GSTIN: {cn.customer_gstin}</p>}
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
              {cn.items?.map((item, i) => (
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
              <span className="font-medium">{formatCurrency(cn.subtotal)}</span>
            </div>
            {isIgst ? (
              <div className="flex justify-between py-2 text-sm">
                <span className="text-gray-500">IGST</span>
                <span className="font-medium">{formatCurrency(cn.igst_total)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-500">CGST</span>
                  <span className="font-medium">{formatCurrency(cn.cgst_total)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-gray-500">SGST</span>
                  <span className="font-medium">{formatCurrency(cn.sgst_total)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between py-3 border-t border-gray-300 text-lg font-bold">
              <span>Credit Total</span>
              <span className="text-red-600">{formatCurrency(cn.grand_total)}</span>
            </div>
          </div>
        </div>

        {cn.amount_in_words && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
            <span className="font-medium">Amount in Words: </span>
            <span className="italic">{cn.amount_in_words}</span>
          </div>
        )}

        {cn.notes && (
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">Notes: </span>{cn.notes}
          </div>
        )}
      </div>
    </div>
  );
}
