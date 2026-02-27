import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../api';
import { formatCurrency } from '../constants';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProducts();
  }, [search]);

  function loadProducts() {
    setLoading(true);
    api.getProducts(search)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }

  function handleDelete(id, name) {
    if (!confirm(`Delete product "${name}"?`)) return;
    api.deleteProduct(id)
      .then(() => {
        toast.success('Product deleted');
        loadProducts();
      })
      .catch((err) => toast.error(err.message));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products & Services</h1>
        <Link to="/products/new" className="btn-primary">+ Add Product</Link>
      </div>

      <div className="card">
        <input
          type="text"
          placeholder="Search products..."
          className="input-field mb-4"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="text-center py-10 text-gray-500">Loading...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">No products found</p>
            <Link to="/products/new" className="btn-primary">Add your first product</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">HSN Code</th>
                  <th className="pb-3 font-medium">Unit</th>
                  <th className="pb-3 font-medium">Rate</th>
                  <th className="pb-3 font-medium">GST Rate</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 font-medium">{p.name}</td>
                    <td className="py-3 text-sm">{p.hsn_code}</td>
                    <td className="py-3">{p.unit}</td>
                    <td className="py-3">{formatCurrency(p.rate)}</td>
                    <td className="py-3">{p.gst_rate}%</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Link to={`/products/${p.id}/edit`} className="text-blue-600 hover:underline text-sm">Edit</Link>
                        <button onClick={() => handleDelete(p.id, p.name)} className="text-red-600 hover:underline text-sm">Delete</button>
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
