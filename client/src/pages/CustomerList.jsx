import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCustomers();
  }, [search]);

  function loadCustomers() {
    setLoading(true);
    api.getCustomers(search)
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }

  function handleDelete(id, name) {
    if (!confirm(`Delete customer "${name}"?`)) return;
    api.deleteCustomer(id)
      .then(() => {
        toast.success('Customer deleted');
        loadCustomers();
      })
      .catch((err) => toast.error(err.message));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <Link to="/customers/new" className="btn-primary">+ Add Customer</Link>
      </div>

      <div className="card">
        <input
          type="text"
          placeholder="Search customers..."
          className="input-field mb-4"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading...</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">No customers found</p>
            <Link to="/customers/new" className="btn-primary">Add your first customer</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">GSTIN</th>
                  <th className="pb-3 font-medium">City</th>
                  <th className="pb-3 font-medium">State</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 font-medium">{c.name}</td>
                    <td className="py-3 text-sm text-gray-600">{c.gstin || '-'}</td>
                    <td className="py-3">{c.city}</td>
                    <td className="py-3">{c.state}</td>
                    <td className="py-3">{c.phone || '-'}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link to={`/customers/${c.id}/edit`} className="text-blue-600 hover:underline text-sm">Edit</Link>
                        <button onClick={() => handleDelete(c.id, c.name)} className="text-red-600 hover:underline text-sm">Delete</button>
                      </div>
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
