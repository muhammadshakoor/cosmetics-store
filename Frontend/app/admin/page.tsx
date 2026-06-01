'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { ProductType } from '@/components/ProductCard';
import { Plus, Pencil, Trash2, X, Save, ShieldAlert, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '',
  brand: '',
  category: 'skincare',
  price: '',
  countInStock: '',
  image: '',
  description: '',
};

type FormData = typeof EMPTY_FORM;

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ProductType[]>('/products');
      setProducts(data);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    if (!user.isAdmin) { return; }
    fetchProducts();
  }, [user, router, fetchProducts]);

  if (!user) return null;

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-500">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${user!.token}` },
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setForm((prev) => ({ ...prev, image: json.url }));
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (product: ProductType) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: String(product.price),
      countInStock: String(product.countInStock),
      image: product.image,
      description: product.description,
    });
    setShowForm(true);
  };

  const handleSave = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!form.image) {
        toast.error('Please upload an image or paste a URL');
        setSaving(false);
        return;
      }
      const payload = {
        name: form.name,
        brand: form.brand,
        category: form.category,
        price: parseFloat(form.price),
        countInStock: parseInt(form.countInStock),
        image: form.image,
        description: form.description,
      };

      if (editingId) {
        await apiFetch(`/products/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) }, user.token);
        toast.success('Product updated!');
      } else {
        await apiFetch('/products', { method: 'POST', body: JSON.stringify(payload) }, user.token);
        toast.success('Product created!');
      }

      setShowForm(false);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' }, user.token);
      toast.success('Product deleted');
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Admin Panel</h1>
            <p className="text-gray-500 text-sm mt-1">{products.length} products in your store</p>
          </div>
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-2xl shadow-md hover:shadow-rose-200 hover:-translate-y-0.5 transition-all"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>

        {/* Products Table */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl h-24 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No products yet</h3>
            <p className="text-gray-400 mb-6">Click "Add Product" to create your first product</p>
            <button onClick={openAddForm} className="px-6 py-2.5 bg-rose-500 text-white rounded-2xl font-medium hover:bg-rose-600 transition-colors">
              Add Product
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Product</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Price</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Stock</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 rounded-xl object-cover bg-gray-100 shrink-0"
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{product.name}</p>
                            <p className="text-xs text-gray-400">{product.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-rose-50 text-rose-600 font-medium capitalize">{product.category}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">${product.price.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${product.countInStock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                          {product.countInStock > 0 ? `${product.countInStock} left` : 'Out of stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditForm(product)}
                            className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(product._id)}
                            disabled={deletingId === product._id}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-gray-50">
              {products.map((product) => (
                <div key={product._id} className="p-4 flex items-start gap-3">
                  <img src={product.image} alt={product.name} className="w-14 h-14 rounded-xl object-cover bg-gray-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-400 mb-1">{product.brand} · {product.category}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">${product.price.toFixed(2)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${product.countInStock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        {product.countInStock > 0 ? `${product.countInStock} left` : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditForm(product)} className="p-2 text-gray-400 hover:text-rose-500 rounded-xl transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(product._id)} disabled={deletingId === product._id} className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-colors disabled:opacity-40">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-8">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Name *</label>
                <input
                  type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rose Petal Glow Serum"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Brand *</label>
                  <input
                    type="text" required value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    placeholder="e.g. Lumina"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Category *</label>
                  <select
                    required value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent bg-white"
                  >
                    <option value="skincare">Skincare</option>
                    <option value="makeup">Makeup</option>
                    <option value="fragrance">Fragrance</option>
                    <option value="haircare">Hair Care</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Price ($) *</label>
                  <input
                    type="number" required min="0" step="0.01" value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="29.99"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Stock Qty *</label>
                  <input
                    type="number" required min="0" value={form.countInStock}
                    onChange={(e) => setForm({ ...form, countInStock: e.target.value })}
                    placeholder="50"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Product Image *</label>
                <div className="space-y-2">
                  {/* Upload from device */}
                  <label className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${uploading ? 'border-rose-300 bg-rose-50' : 'border-gray-200 hover:border-rose-300'}`}>
                    <Upload size={14} className="text-rose-500" />
                    <span className="text-sm text-gray-600">{uploading ? 'Uploading...' : 'Upload from device'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                  {/* Or paste URL */}
                  <input
                    type="url"
                    value={form.image}
                    onChange={(e) => setForm({ ...form, image: e.target.value })}
                    placeholder="Or paste an image URL..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                  />
                  {form.image && (
                    <img src={form.image} alt="preview" className="h-24 w-24 object-cover rounded-xl border border-gray-100" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
                <textarea
                  required value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Describe the product — ingredients, benefits, how to use..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-2xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-linear-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-2xl shadow-md hover:shadow-rose-200 transition-all disabled:opacity-60"
                >
                  <Save size={14} />
                  {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
