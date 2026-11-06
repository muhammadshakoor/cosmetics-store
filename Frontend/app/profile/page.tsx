'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { 
  User, Package, ArrowRight, Truck,
  Sparkles, Heart, ShieldCheck,
  MessageSquareWarning, Clock, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

import OrderStatusBadge from '@/components/OrderStatusBadge';
import SignOutDialog from '@/components/SignOutDialog';
import type { Order, OrderStatus } from '@/types/api';

export default function ProfilePage() {
  const { user, authReady, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const signingOut = useRef(false);
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
    if (!authReady) return;
    if (!user) { if (!signingOut.current) router.replace('/login?redirect=profile'); return; }
    apiFetch<Order[]>('/orders/myorders', {}, user.token)
      .then(data => setOrders(Array.isArray(data) ? data : [])).catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [user, authReady, router]);

  if (!user) return null;

  const validOrders = orders.filter(o => o.status !== 'cancelled');
  const beautyPoints = validOrders.reduce((sum, o) => sum + Math.floor(o.totalPrice / 100), 0);
  const activeOrdersCount = orders.filter(o => ['placed', 'confirmed', 'picked_up', 'on_the_way'].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-gray-50/70 dark:bg-gray-950 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Welcome Header Banner */}
        <div className="bg-linear-to-r from-rose-500 via-pink-500 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5">
                  <Sparkles size={12} className="text-amber-200" /> Lumina Beauty Club
                </span>
                {user.isAdmin && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-gray-950 text-xs font-bold">
                    Store Admin
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user.name}!
              </h1>
              <p className="text-white/80 text-sm mt-1 max-w-xl">
                Manage your account orders, track packages, and redeem your Lumina beauty rewards.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0 bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/20">
              <div className="text-center px-2">
                <p className="text-xl sm:text-2xl font-black">{orders.length}</p>
                <p className="text-[11px] font-medium text-white/80 uppercase tracking-wider mt-0.5">Orders</p>
              </div>
              <div className="text-center px-2 border-x border-white/20">
                <p className="text-xl sm:text-2xl font-black text-amber-200">{beautyPoints}</p>
                <p className="text-[11px] font-medium text-white/80 uppercase tracking-wider mt-0.5">Points</p>
              </div>
              <div className="text-center px-2">
                <p className="text-xl sm:text-2xl font-black">{activeOrdersCount}</p>
                <p className="text-[11px] font-medium text-white/80 uppercase tracking-wider mt-0.5">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid: Balanced 12-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Profile Card, Rewards & Navigation (4 columns) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* User Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <div className="w-20 h-20 rounded-full bg-linear-to-br from-rose-400 to-pink-500 p-1 mx-auto mb-4 shadow-md">
                <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                  <User size={32} className="text-rose-500" />
                </div>
              </div>
              
              <div className="text-center mb-6">
                <h2 className="font-extrabold text-gray-900 dark:text-gray-100 text-xl">{user.name}</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{user.email}</p>
                <div className="flex items-center justify-center gap-1.5 mt-2.5 text-xs text-green-600 dark:text-green-400 font-medium">
                  <ShieldCheck size={14} /> Verified Customer Account
                </div>
              </div>

              {/* Lumina Beauty Club Card */}
              <div className="p-4 bg-linear-to-br from-amber-50/80 to-rose-50/80 dark:from-gray-700/60 dark:to-gray-700/40 border border-amber-200/70 dark:border-gray-600 rounded-2xl mb-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles size={13} /> Reward Club
                  </p>
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-300 font-bold px-2.5 py-0.5 rounded-full">
                    Rs. {beautyPoints} Value
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-black text-gray-900 dark:text-gray-100">{beautyPoints}</span>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Available Points</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                  Earn 1 point for every PKR 100 spent. Redeem points on future checkouts!
                </p>
              </div>

              {/* Navigation Links */}
              <div className="space-y-2">
                {user.isAdmin && (
                  <Link 
                    href="/admin" 
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                  >
                    <span>Store Admin Panel</span>
                    <ArrowRight size={15} />
                  </Link>
                )}
                <Link 
                  href="/wishlist" 
                  className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <span className="flex items-center gap-2.5"><Heart size={16} /> Saved in Wishlist</span>
                  <ArrowRight size={15} />
                </Link>
                <Link 
                  href="/products" 
                  className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <span className="flex items-center gap-2.5"><Package size={16} /> Shop All Products</span>
                  <ArrowRight size={15} />
                </Link>
                <Link 
                  href="/complaints" 
                  className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                >
                  <span className="flex items-center gap-2.5"><MessageSquareWarning size={16} /> Customer Support</span>
                  <ArrowRight size={15} />
                </Link>
                <button
                  onClick={() => setSignOutOpen(true)}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-red-500 border border-red-100 dark:border-red-900/40 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-3 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Help & Guarantee Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <HelpCircle size={16} className="text-rose-500" /> Need Help with an Order?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                Our customer care team is available nationwide Monday to Saturday (9 AM - 8 PM).
              </p>
              <Link 
                href="/contact" 
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                Contact Lumina Support <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Right Column: Orders & Activity (8 columns) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Orders Header */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <Package size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Order History</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Track shipments and view past receipts</p>
                </div>
              </div>
              <span className="px-3.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200">
                {orders.length} Total {orders.length === 1 ? 'Order' : 'Orders'}
              </span>
            </div>

            {/* Order Cards List */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl p-6 h-36 border border-gray-100 dark:border-gray-700 animate-pulse" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4 text-3xl">
                  🛍️
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">No Orders Placed Yet</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                  Explore our collection of organic skincare, botanical soaps, and body care formulations.
                </p>
                <Link 
                  href="/products" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-2xl shadow-sm transition-colors text-sm"
                >
                  Start Shopping <ArrowRight size={15} />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const statusKey = (order.status || (order.isDelivered ? 'delivered' : 'confirmed')) as OrderStatus;
                  const canCancel = ['placed', 'confirmed'].includes(statusKey);
                  return (
                    <div 
                      key={order._id} 
                      className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 sm:p-6 hover:border-rose-200 dark:hover:border-rose-900/50 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-mono font-bold text-gray-700 dark:text-gray-200">
                              #{order._id.slice(-8).toUpperCase()}
                            </span>
                            <OrderStatusBadge status={statusKey} />
                          </div>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1.5">
                            <Clock size={12} />
                            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100">
                            Rs. {Math.round(order.totalPrice).toLocaleString()}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {order.paymentMethod || 'Cash on Delivery'}
                          </p>
                        </div>
                      </div>

                      {/* Items Preview */}
                      <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-3 shrink-0">
                            {order.orderItems.slice(0, 4).map((item, i) => (
                              <img 
                                key={i} 
                                src={item.image || '/products/organic/serum.jpg'} 
                                alt={item.name} 
                                className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 shadow-xs" 
                              />
                            ))}
                            {order.orderItems.length > 4 && (
                              <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
                                +{order.orderItems.length - 4}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                              {order.orderItems.map(i => i.name).join(', ')}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {order.orderItems.reduce((acc, it) => acc + (it.qty || 1), 0)} total units
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                          <Link
                            href={`/order/${order._id}`}
                            className="px-4 py-2 bg-gray-50 hover:bg-rose-50 dark:bg-gray-700/60 dark:hover:bg-rose-900/30 text-gray-800 dark:text-gray-200 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                          >
                            <span>Track & Details</span>
                            <ArrowRight size={13} />
                          </Link>
                          {canCancel && (
                            <button
                              onClick={() => handleCancel(order._id)}
                              disabled={cancellingId === order._id}
                              className="px-3 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {cancellingId === order._id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                        </div>
                      </div>

                      {order.trackingNumber && (
                        <div className="mt-2 pt-3 border-t border-gray-50 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1.5 font-mono">
                            <Truck size={14} className="text-rose-500" /> {order.courierService || 'Courier'}: {order.trackingNumber}
                          </span>
                          <Link href={`/order/${order._id}`} className="text-rose-600 dark:text-rose-400 font-bold hover:underline">
                            Live Tracking →
                          </Link>
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
      <SignOutDialog open={signOutOpen} onCancel={() => setSignOutOpen(false)} onConfirm={() => { signingOut.current = true; setSignOutOpen(false); logout(); router.push('/'); }} />
    </div>
  );
}

