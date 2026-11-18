'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Package, CheckCircle, Clock, Truck, Search, X, ChevronDown, ChevronUp, MapPin, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import AccessibleDialog from '@/components/AccessibleDialog';

type OrderStatus = 'placed' | 'confirmed' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
type FilterStatus = 'all' | OrderStatus;

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  placed:     { label: 'Order Placed',     color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/30' },
  confirmed:  { label: 'Confirmed',        color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30' },
  picked_up:  { label: 'Picked Up',        color: 'text-amber-700 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/30' },
  on_the_way: { label: 'Out for Delivery', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/30' },
  delivered:  { label: 'Delivered',        color: 'text-green-700 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/30' },
  cancelled:  { label: 'Cancelled',        color: 'text-red-700 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/30' },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = { placed: 'confirmed', confirmed: 'picked_up', picked_up: 'on_the_way', on_the_way: 'delivered' };
const NEXT_ACTION: Partial<Record<OrderStatus, string>> = { placed: 'Confirm Order', confirmed: 'Mark Picked Up', picked_up: 'Mark Out for Delivery', on_the_way: 'Mark Delivered' };
const COURIERS = ['PostEx', 'Leopards', 'TCS', 'M&P', 'Swyft', 'CallCourier', 'Pakistan Post', 'Other'];
const COURIER_LINKS: Record<string, string> = {
  PostEx: 'https://postex.pk/tracking/', Leopards: 'https://www.leopardscourier.com/leopards-courier/index.php?id=tracking&cn=',
  TCS: 'https://www.tcsexpress.com/track/', 'M&P': 'https://mpex.pk/track-consignment?number=',
  Swyft: 'https://swyftlogistics.com/tracking?trackingNumber=', CallCourier: 'https://www.callcourier.com.pk/tracking?tracking_number=',
};

interface OrderItem { name: string; qty: number; image: string; price: number; }
interface Order {
  _id: string; user?: { name: string; email: string };
  orderItems: OrderItem[]; address: string; city: string; postalCode: string; country: string;
  paymentMethod: string; itemsPrice: number; taxPrice: number; shippingPrice: number; totalPrice: number;
  phone?: string | null; discountAmount?: number; couponCode?: string | null;
  isDelivered: boolean; status: OrderStatus; trackingNumber?: string; courierService?: string;
  deliveredAt?: string; createdAt: string;
}
interface OrderPage { orders: Order[]; total: number; page: number; pageSize: number; }
interface OrderStats { totalOrders: number; totalRevenue: number; statusCounts: Record<string, number>; }

export default function AdminOrdersPage() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  const [result, setResult] = useState<{ key: string; orders: Order[]; total: number; stats: OrderStats | null; error: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [refresh, setRefresh] = useState(0);
  const pageSize = 25;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [courierOrderId, setCourierOrderId] = useState('');
  const [courierTargetStatus, setCourierTargetStatus] = useState<OrderStatus>('picked_up');
  const [selectedCourier, setSelectedCourier] = useState('PostEx');
  const [trackingNumber, setTrackingNumber] = useState('');
  const requestKey = JSON.stringify([user?._id, user?.token, page, filter, debouncedSearch, refresh]);
  const orders = result?.key === requestKey ? result.orders : [];
  const total = result?.key === requestKey ? result.total : 0;
  const stats = result?.key === requestKey ? result.stats : null;
  const loading = result?.key !== requestKey;
  const loadError = result?.key === requestKey && result.error;

  useEffect(() => {
    if (search.trim() === debouncedSearch) return;
    const timeout = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timeout);
  }, [search, debouncedSearch]);

  useEffect(() => {
    if (!authReady) return;
    if (!user) { router.replace('/login?redirect=admin/orders'); return; }
    if (!user.isAdmin) { router.replace('/'); return; }
    const controller = new AbortController();
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status: filter, search: debouncedSearch });
    Promise.all([
      apiFetch<OrderPage>(`/orders/all?${params}`, { signal: controller.signal, cache: 'no-store' }, user.token),
      apiFetch<OrderStats>('/admin/stats', { signal: controller.signal, cache: 'no-store' }, user.token),
    ]).then(([data, stats]) => {
      if (controller.signal.aborted) return;
      if (page > 1 && data.orders.length === 0) { setPage(Math.max(1, Math.ceil(data.total / pageSize))); return; }
      setResult({ key: requestKey, orders: data.orders, total: data.total, stats, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key: requestKey, orders: [], total: 0, stats: null, error: true });
    });
    return () => controller.abort();
  }, [user, authReady, router, page, filter, debouncedSearch, requestKey]);

  const updateStatus = async (orderId: string, status: OrderStatus, courier?: string, tracking?: string) => {
    if (!user) return;
    setUpdatingId(orderId);
    try {
      await apiFetch(`/orders/${orderId}/status`, { method: 'PUT', body: JSON.stringify({ status, courierService: courier, trackingNumber: tracking }) }, user.token);
      toast.success(`Order ${STATUS_CONFIG[status].label}!`);
      setRefresh(value => value + 1);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Update failed'); }
    finally { setUpdatingId(null); }
  };

  const handleNextStatus = (order: Order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    if (next === 'picked_up' || (next === 'on_the_way' && !order.trackingNumber)) {
      setCourierOrderId(order._id); setCourierTargetStatus(next);
      setSelectedCourier(order.courierService || 'PostEx'); setTrackingNumber(order.trackingNumber || '');
      setShowCourierModal(true);
    } else { updateStatus(order._id, next); }
  };

  const handleCourierSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault(); setShowCourierModal(false);
    updateStatus(courierOrderId, courierTargetStatus, selectedCourier, trackingNumber || undefined);
  };

  const filtered = orders;
  const counts = stats?.statusCounts || {};

  if (!user?.isAdmin) return null;

  const inputCls = 'form-input';

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 py-10 px-4">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" aria-label="Back to admin" className="p-2 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 rounded-xl transition-colors shadow-sm border border-gray-100 dark:border-gray-700">
            <ArrowLeft size={18} className="text-gray-500 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100">Order Management</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{stats?.totalOrders ?? '—'} total orders · Paid revenue: Rs. {stats ? Math.round(stats.totalRevenue).toLocaleString() : '—'}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {(Object.entries(STATUS_CONFIG) as [OrderStatus, typeof STATUS_CONFIG[OrderStatus]][]).map(([status, cfg]) => (
            <button key={status} aria-pressed={filter === status} onClick={() => { setFilter(filter === status ? 'all' : status); setPage(1); }}
              className={`p-4 rounded-2xl border text-left transition-all ${filter === status ? 'border-[#C2185B] shadow-md bg-white dark:bg-gray-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm hover:border-rose-200 dark:hover:border-rose-900/40'}`}>
              <p className="text-xl font-extrabold text-[#1A0A0E] dark:text-gray-100">{stats ? counts[status] ?? 0 : '—'}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} placeholder="Search by order ID, customer, phone or city..." aria-label="Search orders"
              maxLength={100} onChange={e => setSearch(e.target.value)}
              className={`${inputCls} shadow-sm`} style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
            />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"><X size={14} /></button>}
          </div>
        </div>

        {loadError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 p-6 text-center">Orders could not be loaded. <button type="button" onClick={() => setRefresh(value => value + 1)} className="font-semibold underline">Try again</button></div>
        ) : loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl h-20 animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
            <Package size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">No orders found</h3>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
              const nextAction = NEXT_ACTION[order.status];
              const trackUrl = order.courierService && order.trackingNumber ? (COURIER_LINKS[order.courierService] || '') + order.trackingNumber : null;

              return (
                <div key={order._id} className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      {order.status === 'delivered'  ? <CheckCircle size={18} className="text-green-600 dark:text-green-400" /> :
                       order.status === 'on_the_way' ? <MapPin size={18} className="text-orange-600 dark:text-orange-400" /> :
                       order.status === 'picked_up'  ? <Truck size={18} className="text-amber-600 dark:text-amber-400" /> :
                       order.status === 'confirmed'  ? <CheckCircle size={18} className="text-purple-600 dark:text-purple-400" /> :
                       <Clock size={18} className="text-blue-600 dark:text-blue-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">#{order._id.slice(-8).toUpperCase()}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">{order.paymentMethod}</span>
                        {order.trackingNumber && (
                          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-mono">
                            <Truck size={10} /> {order.courierService}: {order.trackingNumber}
                            {trackUrl && <a href={trackUrl} target="_blank" rel="noopener noreferrer" aria-label={`Track order ${order._id.slice(-8).toUpperCase()} with ${order.courierService}`} className="text-brand"><ExternalLink size={10} /></a>}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-[#1A0A0E] dark:text-gray-200">{order.user?.name || 'Customer'}</span>
                        <span>{order.user?.email}</span>
                        <span>{order.city}, {order.country}</span>
                        <span>{new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 sm:shrink-0 sm:flex-nowrap sm:justify-end">
                      <span className="text-lg font-extrabold text-[#1A0A0E] dark:text-gray-100">Rs. {Math.round(order.totalPrice).toLocaleString()}</span>
                      {nextAction && (
                        <button onClick={() => handleNextStatus(order)} disabled={updatingId === order._id}
                          className="button-primary text-xs whitespace-nowrap">
                          <Truck size={11} />
                          {updatingId === order._id ? '...' : nextAction}
                        </button>
                      )}
                      {order.status === 'delivered' && <span className="text-xs text-green-600 dark:text-green-400 font-semibold whitespace-nowrap">✓ Delivered</span>}
                      <button type="button" onClick={() => setExpandedId(expandedId === order._id ? null : order._id)} aria-label={`${expandedId === order._id ? 'Hide' : 'Show'} details for order ${order._id.slice(-8).toUpperCase()}`} aria-expanded={expandedId === order._id} aria-controls={`order-details-${order._id}`} className="inline-flex min-h-11 min-w-11 items-center justify-center p-2 text-brand hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors">
                        {expandedId === order._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {expandedId === order._id && (
                    <div id={`order-details-${order._id}`} className="border-t border-gray-50 dark:border-gray-700 px-5 pb-5 pt-4 bg-gray-50/30 dark:bg-gray-700/20">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Items</p>
                          <div className="space-y-2">
                            {order.orderItems.map((item, i) => (
                              <div key={i} className="flex items-center gap-3">
                                <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover bg-gray-100 dark:bg-gray-700 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-[#1A0A0E] dark:text-gray-100 truncate">{item.name}</p>
                                  <p className="text-xs text-gray-400 dark:text-gray-500">Qty: {item.qty} × Rs. {Math.round(item.price).toLocaleString()}</p>
                                </div>
                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Rs. {Math.round(item.qty * item.price).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Ship To</p>
                            <p className="text-sm font-semibold text-[#1A0A0E] dark:text-gray-100">{order.user?.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{[order.address, order.city, order.postalCode, order.country].filter(Boolean).join(', ')}</p>
                            {order.phone && (
                              <p className="text-xs mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <a href={`tel:${order.phone.replace(/[^\d+]/g, '')}`} className="font-semibold text-[#1A0A0E] dark:text-gray-100 hover:text-[#C2185B]">📞 {order.phone}</a>
                                <a
                                  href={`https://wa.me/${order.phone.replace(/\D/g, '').replace(/^0/, '92')}?text=${encodeURIComponent(`Hi ${order.user?.name || ''}! This is Lumina about your order #${order._id.slice(-8).toUpperCase()}.`)}`}
                                  target="_blank" rel="noopener noreferrer"
                                  className="font-semibold text-[#128C7E] dark:text-[#25D366] hover:underline"
                                >
                                  WhatsApp customer
                                </a>
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Price</p>
                            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex justify-between"><span>Items</span><span>Rs. {Math.round(order.itemsPrice || 0).toLocaleString()}</span></div>
                              <div className="flex justify-between"><span>Shipping</span><span>{order.shippingPrice === 0 ? 'FREE' : `Rs. ${Math.round(order.shippingPrice || 0).toLocaleString()}`}</span></div>
                              {(order.discountAmount || 0) > 0 && (
                                <div className="flex justify-between text-green-600 dark:text-green-400"><span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span><span>-Rs. {Math.round(order.discountAmount || 0).toLocaleString()}</span></div>
                              )}
                              <div className="flex justify-between font-bold text-[#1A0A0E] dark:text-gray-100 text-sm border-t border-gray-200 dark:border-gray-600 pt-1 mt-1"><span>Total</span><span>Rs. {Math.round(order.totalPrice).toLocaleString()}</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!loading && total > 0 && (
          <nav aria-label="Order pages" className="mt-6 flex flex-col items-start justify-between gap-3 text-sm sm:flex-row sm:items-center">
            <p className="text-gray-500 dark:text-gray-400">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} matching orders</p>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)} className="rounded-xl border px-3 py-2 disabled:opacity-40">Previous</button>
              <span>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
              <button type="button" disabled={page * pageSize >= total} onClick={() => setPage(value => value + 1)} className="rounded-xl border px-3 py-2 disabled:opacity-40">Next</button>
            </div>
          </nav>
        )}
      </div>

      {/* Courier Modal */}
      <AccessibleDialog isOpen={showCourierModal} onClose={() => setShowCourierModal(false)} labelledBy="courier-form-title" describedBy="courier-form-description" className="max-w-md">
          <div className="p-6">
            <h2 id="courier-form-title" className="text-xl font-bold text-[#1A0A0E] dark:text-gray-100 mb-1">
              {courierTargetStatus === 'picked_up' ? 'Enter Courier Details' : 'Confirm Out for Delivery'}
            </h2>
            <p id="courier-form-description" className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {courierTargetStatus === 'picked_up' ? 'Add the courier service and tracking number so the customer can track their order.' : 'Update the tracking info if needed and confirm dispatch.'}
            </p>
            <form onSubmit={handleCourierSubmit} className="space-y-4">
              <div>
                <label htmlFor="orders-courier-service" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Courier Service *</label>
                <select id="orders-courier-service" value={selectedCourier} onChange={e => setSelectedCourier(e.target.value)} className={`w-full px-4 py-3 rounded-2xl text-sm ${inputCls}`}>
                  {COURIERS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="orders-tracking-number" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tracking Number <span className="text-gray-400">(optional)</span></label>
                </div>
                <input id="orders-tracking-number" type="text" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="e.g. PX123456789" className={`w-full px-4 py-3 rounded-2xl text-sm font-mono ${inputCls}`} />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Customer will see this and can click to track on courier website.</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCourierModal(false)} className="button-secondary flex-1">Cancel</button>
                <button type="submit" className="button-primary flex-1">
                  {courierTargetStatus === 'picked_up' ? 'Mark Picked Up' : 'Mark Out for Delivery'}
                </button>
              </div>
            </form>
          </div>
      </AccessibleDialog>
    </div>
  );
}
