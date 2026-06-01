'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { User, Package, ArrowRight, CheckCircle, Clock, XCircle, Truck, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

type OrderStatus = 'placed' | 'confirmed' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  placed:     { label: 'Order Placed',      color: 'text-blue-700',   bg: 'bg-blue-50',   icon: <Package size={12} /> },
  confirmed:  { label: 'Confirmed',         color: 'text-purple-700', bg: 'bg-purple-50', icon: <CheckCircle size={12} /> },
  picked_up:  { label: 'Picked Up',         color: 'text-amber-700',  bg: 'bg-amber-50',  icon: <Truck size={12} /> },
  on_the_way: { label: 'Out for Delivery',  color: 'text-orange-700', bg: 'bg-orange-50', icon: <MapPin size={12} /> },
  delivered:  { label: 'Delivered',         color: 'text-green-700',  bg: 'bg-green-50',  icon: <CheckCircle size={12} /> },
  cancelled:  { label: 'Cancelled',         color: 'text-red-700',    bg: 'bg-red-50',    icon: <XCircle size={12} /> },
};

interface OrderItem { name: string; qty: number; image: string; price: number; }
interface Order {
  _id: string;
  orderItems: OrderItem[];
  totalPrice: number;
  isPaid: boolean;
  isDelivered: boolean;
  status: OrderStatus;
  trackingNumber?: string;
  courierService?: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (orderId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setCancellingId(orderId);
    try {
      await apiFetch(`/orders/${orderId}/cancel`, { method: 'PUT', body: JSON.stringify({ reason: 'Cancelled by customer' }) }, user.token);
      toast.success('Order cancelled successfully');
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'cancelled' as OrderStatus } : o));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    apiFetch<Order[]>('/orders/myorders', {}, user.token)
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">My Account</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Profile Card */}
          <div className="md:col-span-1 bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
            <div className="w-16 h-16 rounded-full bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center mx-auto mb-4 shadow-md">
              <User size={28} className="text-white" />
            </div>
            <div className="text-center mb-6">
              <h2 className="font-bold text-gray-900 text-lg">{user.name}</h2>
              <p className="text-sm text-gray-400">{user.email}</p>
              {user.isAdmin && (
                <span className="mt-2 inline-block text-xs px-2 py-1 bg-rose-50 text-rose-600 rounded-full font-medium">Admin</span>
              )}
            </div>
            <div className="space-y-2">
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  Admin Panel <ArrowRight size={14} />
                </Link>
              )}
              <Link
                href="/products"
                className="flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                Shop Products <ArrowRight size={14} />
              </Link>
              <button
                onClick={() => { logout(); router.push('/'); }}
                className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-red-500 border border-red-100 rounded-2xl hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Orders */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Package size={18} className="text-rose-500" />
              <h2 className="text-lg font-bold text-gray-900">My Orders</h2>
              <span className="text-sm text-gray-400">({orders.length})</span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-3xl h-24 animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 text-center">
                <div className="text-4xl mb-3">🛍️</div>
                <p className="text-gray-500 mb-4">You haven&apos;t placed any orders yet.</p>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-500 text-white font-semibold rounded-2xl hover:bg-rose-600 transition-colors text-sm"
                >
                  Start Shopping <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const statusKey = (order.status || (order.isDelivered ? 'delivered' : 'confirmed')) as OrderStatus;
                  const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.confirmed;
                  const canCancel = ['placed', 'confirmed'].includes(statusKey);
                  return (
                  <div key={order._id} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 hover:border-rose-100 hover:shadow-md transition-all">
                    <Link href={`/order/${order._id}`} className="block">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="text-xs font-mono text-gray-400">#{order._id.slice(-8).toUpperCase()}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                          {order.trackingNumber && (
                            <p className="text-xs text-gray-400 mt-0.5 font-mono">{order.courierService}: {order.trackingNumber}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#1A0A0E]">${order.totalPrice.toFixed(2)}</p>
                          <span className={`inline-flex items-center gap-1 mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex -space-x-2">
                        {order.orderItems.slice(0, 4).map((item, i) => (
                          <img
                            key={i}
                            src={item.image}
                            alt={item.name}
                            className="w-8 h-8 rounded-full object-cover border-2 border-white bg-gray-100"
                          />
                        ))}
                        {order.orderItems.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500 font-medium">
                            +{order.orderItems.length - 4}
                          </div>
                        )}
                        <span className="ml-3 self-center text-xs text-gray-500">
                          {order.orderItems.length} item{order.orderItems.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </Link>
                    {canCancel && (
                      <div className="border-t border-gray-50 mt-3 pt-3">
                        <button
                          onClick={() => handleCancel(order._id)}
                          disabled={cancellingId === order._id}
                          className="text-xs text-red-500 hover:text-red-700 font-semibold flex items-center gap-1 disabled:opacity-50"
                        >
                          <XCircle size={12} />
                          {cancellingId === order._id ? 'Cancelling...' : 'Cancel Order'}
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
