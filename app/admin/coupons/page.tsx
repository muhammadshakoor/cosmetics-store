'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, X, Tag, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import AccessibleDialog from '@/components/AccessibleDialog';

interface Coupon {
  _id: string; code: string; type: 'percent' | 'flat'; value: number;
  minOrder: number; usageLimit: number; usedCount: number; isActive: boolean;
  expiresAt?: string; createdAt: string;
}

const EMPTY_FORM = { code: '', type: 'percent' as 'percent' | 'flat', value: '', minOrder: '', usageLimit: '100', expiresAt: '' };

export default function AdminCouponsPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  const [result, setResult] = useState<{ key: string; coupons: Coupon[]; error: boolean } | null>(null);
  const [refresh, setRefresh] = useState(0);
  const requestKey = JSON.stringify([user?._id, user?.token, refresh]);
  const coupons = result?.key === requestKey ? result.coupons : [];
  const loading = result?.key !== requestKey;
  const loadError = result?.key === requestKey && result.error;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.isAdmin) { router.replace('/'); return; }
    const controller = new AbortController();
    fetch('/api/coupon', { headers: { Authorization: `Bearer ${user.token}` }, signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Failed to load coupons');
        const coupons: unknown = await response.json();
        if (!Array.isArray(coupons)) throw new Error('Failed to load coupons');
        return coupons as Coupon[];
      })
      .then(coupons => { if (!controller.signal.aborted) setResult({ key: requestKey, coupons, error: false }); })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, coupons: [], error: true });
          toast.error('Failed to load coupons');
        }
      });
    return () => controller.abort();
  }, [user, authReady, router, requestKey]);

  const handleCreate = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!form.code.trim() || !form.value) { toast.error('Code and value are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/coupon/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user!.token}` },
        body: JSON.stringify({ code: form.code.trim().toUpperCase(), type: form.type, value: parseFloat(form.value), minOrder: parseFloat(form.minOrder || '0'), usageLimit: parseInt(form.usageLimit || '100'), expiresAt: form.expiresAt || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Coupon created!'); setShowForm(false); setForm(EMPTY_FORM); setRefresh(value => value + 1);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to create'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (coupon: Coupon) => {
    setTogglingId(coupon._id);
    try {
      const res = await fetch('/api/coupon/manage', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user!.token}` }, body: JSON.stringify({ id: coupon._id, isActive: !coupon.isActive }) });
      if (!res.ok) throw new Error();
      setResult(prev => prev?.key === requestKey ? { ...prev, coupons: prev.coupons.map(c => c._id === coupon._id ? { ...c, isActive: !c.isActive } : c) } : prev);
      toast.success(coupon.isActive ? 'Coupon deactivated' : 'Coupon activated');
    } catch { toast.error('Failed to toggle coupon'); }
    finally { setTogglingId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch('/api/coupon/manage', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user!.token}` }, body: JSON.stringify({ id }) });
      if (!res.ok) throw new Error();
      toast.success('Coupon deleted'); setResult(prev => prev?.key === requestKey ? { ...prev, coupons: prev.coupons.filter(c => c._id !== id) } : prev);
    } catch { toast.error('Failed to delete coupon'); }
    finally { setDeletingId(null); }
  };

  if (!user?.isAdmin) return null;

  const activeCoupons = coupons.filter(c => c.isActive).length;
  const inputCls = 'form-input';

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 py-10 px-4">
      <div className="max-w-5xl mx-auto">

        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Link href="/admin" aria-label="Back to admin" className="p-2 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 rounded-xl transition-colors shadow-sm border border-gray-100 dark:border-gray-700">
            <ArrowLeft size={18} className="text-gray-500 dark:text-gray-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100">Coupon Management</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{coupons.length} coupons · {activeCoupons} active</p>
          </div>
          <button onClick={() => setShowForm(true)} className="button-primary w-full shadow-md sm:w-auto">
            <Plus size={16} /> Create Coupon
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-2xl font-extrabold text-[#1A0A0E] dark:text-gray-100">{coupons.length}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Total Coupons</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">{activeCoupons}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Active</p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-2xl font-extrabold text-[#1A0A0E] dark:text-gray-100">{coupons.reduce((s, c) => s + c.usedCount, 0)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">Total Uses</p>
          </div>
        </div>

        {loadError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-white p-6 text-center dark:border-rose-900/40 dark:bg-gray-800">
            Coupons could not be loaded. <button type="button" onClick={() => setRefresh(value => value + 1)} className="font-semibold underline">Try again</button>
          </div>
        ) : loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl h-20 animate-pulse" />)}</div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
            <Tag size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No coupons yet</h3>
            <p className="text-gray-400 dark:text-gray-500 mb-6">Create your first coupon to offer discounts to customers.</p>
            <button onClick={() => setShowForm(true)} className="button-primary">Create Coupon</button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                    {['Code', 'Discount', 'Min Order', 'Usage', 'Expires', 'Status', 'Actions'].map(h => (
                      <th key={h} className={`px-6 py-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                  {coupons.map(coupon => (
                    <tr key={coupon._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-[#1A0A0E] dark:text-gray-100 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg text-sm">{coupon.code}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {coupon.type === 'percent' ? `${coupon.value}% off` : `Rs. ${coupon.value} off`}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {coupon.minOrder > 0 ? `Rs. ${coupon.minOrder.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{coupon.usedCount} / {coupon.usageLimit}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${coupon.isActive ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleToggle(coupon)} disabled={togglingId === coupon._id} aria-label={`${coupon.isActive ? 'Deactivate' : 'Activate'} coupon ${coupon.code}`} className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-brand hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors disabled:opacity-40">
                            {coupon.isActive ? <ToggleRight size={18} className="text-green-500 dark:text-green-400" /> : <ToggleLeft size={18} />}
                          </button>
                          <button onClick={() => handleDelete(coupon._id)} disabled={deletingId === coupon._id} aria-label={`Delete coupon ${coupon.code}`} className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-brand hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-40">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-700">
              {coupons.map(coupon => (
                <div key={coupon._id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono font-bold text-[#1A0A0E] dark:text-gray-100 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg text-sm">{coupon.code}</span>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${coupon.isActive ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                    {coupon.type === 'percent' ? `${coupon.value}% off` : `Rs. ${coupon.value} off`}
                    {coupon.minOrder > 0 && ` · Min Rs. ${coupon.minOrder.toFixed(2)}`}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Used {coupon.usedCount}/{coupon.usageLimit}
                    {coupon.expiresAt && ` · Expires ${new Date(coupon.expiresAt).toLocaleDateString()}`}
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleToggle(coupon)} disabled={togglingId === coupon._id} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-40">
                      {coupon.isActive ? <><ToggleRight size={14} className="text-green-500" /> Deactivate</> : <><ToggleLeft size={14} /> Activate</>}
                    </button>
                    <button onClick={() => handleDelete(coupon._id)} disabled={deletingId === coupon._id} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-500 border border-red-100 dark:border-red-900/30 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AccessibleDialog isOpen={showForm} onClose={() => setShowForm(false)} labelledBy="coupon-form-title" className="max-w-md">
          <div>
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
              <h2 id="coupon-form-title" className="text-lg font-bold text-gray-900 dark:text-gray-100">Create Coupon</h2>
              <button type="button" aria-label="Close coupon form" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-brand hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-5">
              <div>
                <label htmlFor="coupons-coupon-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Coupon Code *</label>
                <input id="coupons-coupon-code" type="text" required value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. LUMINA20" className={`${inputCls} font-mono uppercase`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="coupons-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type *</label>
                  <select id="coupons-type" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'percent' | 'flat' })} className={inputCls}>
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (Rs.)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="coupons-value" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Value * {form.type === 'percent' ? '(%)' : '(Rs.)'}</label>
                  <input id="coupons-value" type="number" required min="1" step={form.type === 'percent' ? '1' : '0.01'} max={form.type === 'percent' ? '100' : undefined} value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percent' ? '10' : '500'} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="coupons-min-order-rs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Min Order (Rs.)</label>
                  <input id="coupons-min-order-rs" type="number" min="0" step="0.01" value={form.minOrder} onChange={e => setForm({ ...form, minOrder: e.target.value })} placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label htmlFor="coupons-usage-limit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Usage Limit</label>
                  <input id="coupons-usage-limit" type="number" min="1" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: e.target.value })} placeholder="100" className={inputCls} />
                </div>
              </div>
              <div>
                <label htmlFor="coupons-expiry-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Expiry Date <span className="text-gray-400">(optional)</span></label>
                <input id="coupons-expiry-date" type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} min={new Date().toISOString().split('T')[0]} className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="button-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="button-primary flex-1 shadow-md">
                  <Save size={14} />{saving ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
      </AccessibleDialog>
    </div>
  );
}
