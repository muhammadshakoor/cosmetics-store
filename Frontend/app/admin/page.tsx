'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { ProductType } from '@/components/ProductCard';
import { Plus, Pencil, Trash2, X, Save, ShieldAlert, Upload, ShoppingBag, Package, ArrowRight, Tag, BarChart2, MessageSquareWarning, Download, Search, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', brand: '', category: 'skincare', price: '', countInStock: '', image: '', description: '' };
type FormData = typeof EMPTY_FORM;

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [products, setProducts] = useState<ProductType[]>([]);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');

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
    if (!user) { router.replace('/login?redirect=admin'); return; }
    if (!user.isAdmin) return;
    fetchProducts();
    apiFetch<{ _id: string; isDelivered: boolean }[]>('/orders/all', {}, user.token)
      .then(orders => { setOrderCount(orders.length); setPendingCount(orders.filter(o => !o.isDelivered).length); })
      .catch(() => {});
  }, [user, router, fetchProducts]);

  if (!user) return null;

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Access Denied</h2>
          <p className="text-gray-500 dark:text-gray-400">You need admin privileges to view this page.</p>
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
      const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${user!.token}` }, body: data });
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

  const openAddForm = () => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); };
  const openEditForm = (product: ProductType) => {
    setEditingId(product._id);
    setForm({ name: product.name, brand: product.brand, category: product.category, price: String(product.price), countInStock: String(product.countInStock), image: product.image, description: product.description });
    setShowForm(true);
  };

  const handleSave = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!form.image) { toast.error('Please upload an image or paste a URL'); setSaving(false); return; }
      const payload = { name: form.name, brand: form.brand, category: form.category, price: parseFloat(form.price), countInStock: parseInt(form.countInStock), image: form.image, description: form.description };
      if (editingId) { await apiFetch(`/products/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) }, user.token); toast.success('Product updated!'); }
      else { await apiFetch('/products', { method: 'POST', body: JSON.stringify(payload) }, user.token); toast.success('Product created!'); }
      setShowForm(false); fetchProducts();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' }, user.token);
      toast.success('Product deleted');
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed'); }
    finally { setDeletingId(null); }
  };

  const q = query.trim().toLowerCase();
  const visibleProducts = q
    ? products.filter((p) => [p.name, p.brand, p.category].some((v) => v?.toLowerCase().includes(q)))
    : products;
  const lowStock = products.filter((p) => p.countInStock <= 5);
  const stockBadge = (n: number) =>
    n === 0 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
    : n <= 5 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
    : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400';

  const handleExportCSV = () => {
    if (products.length === 0) { toast.error('No products to export'); return; }
    const headers = ['ID', 'Name', 'Brand', 'Category', 'Price', 'Stock', 'Image', 'Description'];
    const rows = products.map(p => [
      `"${p._id}"`, `"${p.name.replace(/"/g, '""')}"`, `"${p.brand}"`, `"${p.category}"`,
      p.price, p.countInStock, `"${p.image}"`, `"${(p.description || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lumina_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('📊 Inventory CSV exported!');
  };

  const inputCls = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent';

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100">Admin Panel</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your store inventory & operations</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold rounded-2xl shadow-xs transition-all text-xs"
            >
              <Download size={14} className="text-gray-500" /> Export CSV
            </button>
            <button onClick={openAddForm} className="flex items-center gap-2 px-5 py-2.5 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl shadow-md transition-all text-xs">
              <Plus size={16} /> Add Product
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-3">
              <Package size={20} className="text-blue-600" />
            </div>
            <p className="text-2xl font-extrabold text-[#1A0A0E] dark:text-gray-100">{products.length}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Total Products</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-3">
              <ShoppingBag size={20} className="text-[#C2185B]" />
            </div>
            <p className="text-2xl font-extrabold text-[#1A0A0E] dark:text-gray-100">{orderCount ?? '—'}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Total Orders</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-[#C2185B] rounded-3xl p-5 shadow-md">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
              <ShoppingBag size={20} className="text-white" />
            </div>
            <p className="text-2xl font-extrabold text-white">{pendingCount ?? '—'}</p>
            <p className="text-xs text-white/80 font-medium mt-0.5">Pending Orders</p>
            <Link href="/admin/orders" className="flex items-center gap-1 text-white text-xs font-bold mt-3 hover:gap-2 transition-all">
              View All Orders <ArrowRight size={12} />
            </Link>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-3">
              <Tag size={20} className="text-[#C2185B]" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Manage discount coupons</p>
            <Link href="/admin/coupons" className="flex items-center gap-1 text-[#C2185B] text-xs font-bold hover:gap-2 transition-all">Manage Coupons <ArrowRight size={12} /></Link>
          </div>
          <div className="bg-[#C2185B] rounded-3xl p-5 shadow-md">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
              <BarChart2 size={20} className="text-white" />
            </div>
            <p className="text-sm font-semibold text-white mb-1">Revenue, top products &amp; charts</p>
            <Link href="/admin/dashboard" className="flex items-center gap-1 text-white text-xs font-bold mt-1 hover:gap-2 transition-all">Sales Dashboard <ArrowRight size={12} /></Link>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center mb-3">
              <MessageSquareWarning size={20} className="text-[#C2185B]" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Review customer complaints</p>
            <Link href="/admin/complaints" className="flex items-center gap-1 text-[#C2185B] text-xs font-bold hover:gap-2 transition-all">View Complaints <ArrowRight size={12} /></Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-xl font-bold text-[#1A0A0E] dark:text-gray-100">
            Products ({products.length})
            {lowStock.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                <AlertTriangle size={12} aria-hidden="true" /> {lowStock.length} low or out of stock
              </span>
            )}
          </h2>
          <div className="relative sm:w-72">
            <Search size={15} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              aria-label="Search products" placeholder="Search by name, brand or category..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl h-24 animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No products yet</h3>
            <p className="text-gray-400 dark:text-gray-500 mb-6">Click &quot;Add Product&quot; to create your first product</p>
            <button onClick={openAddForm} className="px-6 py-2.5 bg-[#C2185B] text-white rounded-2xl font-medium hover:bg-[#A31555] transition-colors">Add Product</button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {visibleProducts.length === 0 && (
              <p className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">No products match &ldquo;{query}&rdquo;.</p>
            )}
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    {['Product', 'Category', 'Price', 'Stock', 'Actions'].map(h => (
                      <th key={h} className={`px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {visibleProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img src={product.image} alt={product.name} className="w-10 h-10 rounded-xl object-cover bg-gray-100 dark:bg-gray-700 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">{product.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{product.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-medium capitalize">{product.category}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">Rs. {Math.round(product.price).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${stockBadge(product.countInStock)}`}>
                          {product.countInStock > 0 ? `${product.countInStock} left` : 'Out of stock'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditForm(product)} className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors" aria-label={`Edit ${product.name}`} title="Edit"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(product._id)} disabled={deletingId === product._id} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-40" aria-label={`Delete ${product.name}`} title="Delete"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-700">
              {visibleProducts.map((product) => (
                <div key={product._id} className="p-4 flex items-start gap-3">
                  <img src={product.image} alt={product.name} className="w-14 h-14 rounded-xl object-cover bg-gray-100 dark:bg-gray-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{product.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{product.brand} · {product.category}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Rs. {Math.round(product.price).toLocaleString()}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stockBadge(product.countInStock)}`}>
                        {product.countInStock > 0 ? `${product.countInStock} left` : 'Out of stock'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditForm(product)} aria-label={`Edit ${product.name}`} className="p-2 text-gray-400 hover:text-rose-500 rounded-xl transition-colors"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(product._id)} disabled={deletingId === product._id} aria-label={`Delete ${product.name}`} className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-colors disabled:opacity-40"><Trash2 size={14} /></button>
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
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 rounded-t-3xl">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close form" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label htmlFor="admin-product-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product Name *</label>
                <input id="admin-product-name" type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rose Petal Glow Serum" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="admin-brand" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Brand *</label>
                  <input id="admin-brand" type="text" required value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Lumina" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="admin-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category *</label>
                  <select id="admin-category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                    <option value="skincare">Skincare</option>
                    <option value="soaps">Handmade Soaps</option>
                    <option value="bodycare">Body Care</option>
                    <option value="haircare">Hair Care</option>
                    <option value="fragrance">Fragrance</option>
                    <option value="makeup">Makeup</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="admin-price-rs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price (Rs.) *</label>
                  <input id="admin-price-rs" type="number" required min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="29.99" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="admin-stock-qty" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Stock Qty *</label>
                  <input id="admin-stock-qty" type="number" required min="0" value={form.countInStock} onChange={(e) => setForm({ ...form, countInStock: e.target.value })} placeholder="50" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product Image *</label>
                <div className="space-y-2">
                  <label className={`flex items-center gap-2 px-4 py-2.5 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${uploading ? 'border-rose-300 bg-rose-50 dark:bg-rose-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-rose-300'}`}>
                    <Upload size={14} className="text-rose-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{uploading ? 'Uploading...' : 'Upload from device'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                  <input type="url" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Or paste an image URL..." className={inputCls} />
                  {form.image && <img src={form.image} alt="preview" className="h-24 w-24 object-cover rounded-xl border border-gray-100 dark:border-gray-700" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                </div>
              </div>
              <div>
                <label htmlFor="admin-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description *</label>
                <textarea id="admin-description" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the product — ingredients, benefits, how to use..." className={`${inputCls} resize-none`} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-linear-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-2xl shadow-md hover:shadow-rose-200 transition-all disabled:opacity-60">
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
