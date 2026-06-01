'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import {
  ArrowLeft, Package, CheckCircle, Clock, Truck,
  Search, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderItem { name: string; qty: number; image: string; price: number; }
interface Order {
  _id: string;
  userId: string;
  user?: { name: string; email: string };
  orderItems: OrderItem[];
  address: string; city: string; postalCode: string; country: string;
  paymentMethod: string;
  itemsPrice: number; taxPrice: number; shippingPrice: number; totalPrice: number;
  isPaid: boolean;
  isDelivered: boolean;
  deliveredAt?: string;
  createdAt: string;
}

type FilterStatus = 'all' | 'pending' | 'delivered';

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [delivering, setDelivering] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiFetch<Order[]>('/orders/all', {}, user.token);
      setOrders(data);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    if (!user.isAdmin) { router.replace('/'); return; }
    fetchOrders();
  }, [user, router, fetchOrders]);

  const markDelivered = async (orderId: string) => {
    if (!user) return;
    setDelivering(orderId);
    try {
      await apiFetch(`/orders/${orderId}/deliver`, { method: 'PUT' }, user.token);
      toast.success('Order marked as delivered!');
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, isDelivered: true, deliveredAt: new Date().toISOString() } : o));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally {
      setDelivering(null);
    }
  };

  const filtered = orders.filter(o => {
    const matchesSearch =
      o._id.toLowerCase().includes(search.toLowerCase()) ||
      (o.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
      o.city.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'pending' && !o.isDelivered) ||
      (filter === 'delivered' && o.isDelivered);
    return matchesSearch && matchesFilter;
  });

  const totalRevenue = orders.reduce((s, o) => s + o.totalPrice, 0);
  const pendingCount = orders.filter(o => !o.isDelivered).length;
  const deliveredCount = orders.filter(o => o.isDelivered).length;

  if (!user?.isAdmin) return null;

  return (
    <div className="min-h-screen bg-[#FFF8F5] py-10 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 hover:bg-white rounded-xl transition-colors">
            <ArrowLeft size={18} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-[#1A0A0E]">Orders</h1>
            <p className="text-gray-500 text-sm mt-0.5">{orders.length} total orders</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Orders',   value: orders.length,             icon: <Package size={20} />,      color: 'bg-blue-50 text-blue-600' },
            { label: 'Pending',        value: pendingCount,              icon: <Clock size={20} />,        color: 'bg-amber-50 text-amber-600' },
            { label: 'Delivered',      value: deliveredCount,            icon: <CheckCircle size={20} />,  color: 'bg-green-50 text-green-600' },
            { label: 'Total Revenue',  value: `$${totalRevenue.toFixed(2)}`, icon: <Truck size={20} />,   color: 'bg-rose-50 text-[#C2185B]' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${color}`}>{icon}</div>
              <p className="text-2xl font-extrabold text-[#1A0A0E]">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} placeholder="Search by order ID, customer name or city..."
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'delivered'] as FilterStatus[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-2xl text-sm font-semibold capitalize transition-all ${
                  filter === f ? 'bg-[#C2185B] text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:border-rose-300'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-3xl h-20 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <Package size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-500">No orders found</h3>
            {search && <button onClick={() => setSearch('')} className="mt-3 text-sm text-rose-500">Clear search</button>}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(order => (
              <div key={order._id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Order Row */}
                <div className="flex items-center gap-4 p-5">
                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    order.isDelivered ? 'bg-green-50' : 'bg-amber-50'
                  }`}>
                    {order.isDelivered
                      ? <CheckCircle size={18} className="text-green-500" />
                      : <Clock size={18} className="text-amber-500" />
                    }
                  </div>

                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-1">
                      <span className="text-xs font-mono text-gray-400">#{order._id.slice(-8).toUpperCase()}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        order.isDelivered ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {order.isDelivered ? 'Delivered' : 'Processing'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {order.paymentMethod}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      <span className="font-semibold text-[#1A0A0E]">{order.user?.name || 'Customer'}</span>
                      <span>{order.user?.email}</span>
                      <span>{order.city}, {order.country}</span>
                      <span>{new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* Price + actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-lg font-extrabold text-[#1A0A0E]">${order.totalPrice.toFixed(2)}</span>
                    {!order.isDelivered && (
                      <button
                        onClick={() => markDelivered(order._id)}
                        disabled={delivering === order._id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#C2185B] hover:bg-[#A31555] text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
                      >
                        <Truck size={12} />
                        {delivering === order._id ? 'Updating...' : 'Mark Delivered'}
                      </button>
                    )}
                    {order.isDelivered && (
                      <span className="text-xs text-green-600 font-medium">
                        ✓ {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : 'Delivered'}
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      {expandedId === order._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === order._id && (
                  <div className="border-t border-gray-50 px-5 pb-5 pt-4 bg-gray-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Items */}
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order Items</p>
                        <div className="space-y-2">
                          {order.orderItems.map((item, i) => (
                            <div key={i} className="flex items-center gap-3">
                              <img src={item.image} alt={item.name} className="w-10 h-10 rounded-xl object-cover bg-gray-100 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-[#1A0A0E] truncate">{item.name}</p>
                                <p className="text-xs text-gray-400">Qty: {item.qty} × ${item.price.toFixed(2)}</p>
                              </div>
                              <p className="text-xs font-bold text-[#1A0A0E] shrink-0">${(item.qty * item.price).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shipping + Summary */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ship To</p>
                          <p className="text-sm text-[#1A0A0E] font-medium">{order.user?.name}</p>
                          <p className="text-xs text-gray-500">{order.address}</p>
                          <p className="text-xs text-gray-500">{order.city}, {order.postalCode}</p>
                          <p className="text-xs text-gray-500">{order.country}</p>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Price Summary</p>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-gray-500"><span>Items</span><span>${order.itemsPrice.toFixed(2)}</span></div>
                            <div className="flex justify-between text-gray-500"><span>Shipping</span><span>{order.shippingPrice === 0 ? 'FREE' : `$${order.shippingPrice.toFixed(2)}`}</span></div>
                            <div className="flex justify-between text-gray-500"><span>Tax</span><span>${order.taxPrice.toFixed(2)}</span></div>
                            <div className="flex justify-between font-bold text-[#1A0A0E] text-sm pt-1 border-t border-gray-200 mt-1">
                              <span>Total</span><span>${order.totalPrice.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
