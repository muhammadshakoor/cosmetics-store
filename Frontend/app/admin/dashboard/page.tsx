'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { TrendingUp, ShoppingBag, Package, ArrowLeft, BarChart2, Tag, Clock, ShieldAlert } from 'lucide-react';

interface Stats {
  totalRevenue: number;
  monthRevenue: number;
  todayRevenue: number;
  totalOrders: number;
  todayOrders: number;
  statusCounts: Record<string, number>;
  monthlyRevenue: Record<string, number>;
  topProducts: { id: string; name: string; image: string; revenue: number; sold: number }[];
  categoryRevenue: Record<string, number>;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  placed:     { label: 'Placed',            color: 'bg-blue-400' },
  confirmed:  { label: 'Confirmed',         color: 'bg-purple-400' },
  picked_up:  { label: 'Picked Up',         color: 'bg-amber-400' },
  on_the_way: { label: 'Out for Delivery',  color: 'bg-orange-400' },
  delivered:  { label: 'Delivered',         color: 'bg-green-400' },
  cancelled:  { label: 'Cancelled',         color: 'bg-red-400' },
};

const CAT_META: Record<string, { label: string; color: string }> = {
  skincare:  { label: 'Skincare',  color: 'bg-emerald-400' },
  makeup:    { label: 'Makeup',    color: 'bg-pink-400' },
  fragrance: { label: 'Fragrance', color: 'bg-purple-400' },
  haircare:  { label: 'Hair Care', color: 'bg-amber-400' },
  jewelry:   { label: 'Jewellery', color: 'bg-yellow-400' },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    if (!user.isAdmin) return;
    fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${user.token}` } })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, router]);

  if (!user) return null;

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert size={28} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Access Denied</h2>
        </div>
      </div>
    );
  }

  const months = stats
    ? Object.entries(stats.monthlyRevenue)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6)
    : [];
  const maxMonthRevenue = Math.max(...months.map(([, v]) => v), 1);

  const catEntries = stats
    ? Object.entries(stats.categoryRevenue).sort((a, b) => b[1] - a[1])
    : [];
  const maxCatRevenue = Math.max(...catEntries.map(([, v]) => v), 1);

  const totalOrders = stats
    ? Object.values(stats.statusCounts).reduce((s, v) => s + v, 0)
    : 0;

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 py-10 px-4">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin" className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition-colors">
            <ArrowLeft size={18} className="text-gray-500 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100">Sales Dashboard</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Revenue analytics &amp; store performance</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl h-28 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="space-y-6">

            {/* Revenue Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#C2185B] rounded-3xl p-5 text-white shadow-lg shadow-rose-100 col-span-2 lg:col-span-1">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                  <TrendingUp size={20} />
                </div>
                <p className="text-2xl font-extrabold">Rs. {Math.round(stats.totalRevenue).toLocaleString()}</p>
                <p className="text-white/80 text-xs mt-1 font-medium">Total Revenue (all time)</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-3">
                  <BarChart2 size={20} className="text-purple-500 dark:text-purple-400" />
                </div>
                <p className="text-2xl font-extrabold text-[#1A0A0E] dark:text-gray-100">Rs. {Math.round(stats.monthRevenue).toLocaleString()}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 font-medium">This Month</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mb-3">
                  <TrendingUp size={20} className="text-green-500 dark:text-green-400" />
                </div>
                <p className="text-2xl font-extrabold text-[#1A0A0E] dark:text-gray-100">Rs. {Math.round(stats.todayRevenue).toLocaleString()}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 font-medium">Today&apos;s Revenue</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-3">
                  <ShoppingBag size={20} className="text-blue-500 dark:text-blue-400" />
                </div>
                <p className="text-2xl font-extrabold text-[#1A0A0E] dark:text-gray-100">{stats.totalOrders}</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 font-medium">Total Orders · {stats.todayOrders} today</p>
              </div>
            </div>

            {/* Monthly Revenue Bar Chart */}
            {months.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg font-bold text-[#1A0A0E] dark:text-gray-100 mb-6">Monthly Revenue</h2>
                <div className="flex items-end gap-2 sm:gap-4" style={{ height: '140px' }}>
                  {months.map(([month, revenue]) => {
                    const pct = (revenue / maxMonthRevenue) * 100;
                    const label = new Date(month + '-01').toLocaleDateString('en-US', {
                      month: 'short', year: '2-digit',
                    });
                    return (
                      <div key={month} className="flex-1 flex flex-col items-center gap-1">
                        <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 text-center">
                          {Math.round(revenue / 1000)}K
                        </p>
                        <div className="w-full flex-1 flex items-end">
                          <div
                            className="w-full bg-[#C2185B] hover:bg-[#A31555] rounded-t-xl transition-colors cursor-default"
                            style={{ height: `${Math.max(pct, 3)}%`, minHeight: '6px' }}
                            title={`Rs. ${Math.round(revenue).toLocaleString()}`}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Order Status */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg font-bold text-[#1A0A0E] dark:text-gray-100 mb-4">Order Status</h2>
                <div className="space-y-3">
                  {Object.entries(stats.statusCounts).map(([status, count]) => {
                    const cfg = STATUS_META[status] || { label: status, color: 'bg-gray-400' };
                    const pct = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-gray-600 dark:text-gray-300">{cfg.label}</span>
                          <span className="text-gray-400 dark:text-gray-500">{count} ({Math.round(pct)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${cfg.color} rounded-full transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(stats.statusCounts).length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No orders yet</p>
                  )}
                </div>
              </div>

              {/* Category Revenue */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg font-bold text-[#1A0A0E] dark:text-gray-100 mb-4">Revenue by Category</h2>
                <div className="space-y-3">
                  {catEntries.map(([cat, revenue]) => {
                    const cfg = CAT_META[cat] || { label: cat, color: 'bg-gray-400' };
                    const pct = (revenue / maxCatRevenue) * 100;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs font-medium mb-1">
                          <span className="text-gray-600 dark:text-gray-300">{cfg.label}</span>
                          <span className="text-gray-400 dark:text-gray-500">Rs. {Math.round(revenue / 1000)}K</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${cfg.color} rounded-full transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {catEntries.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No sales data yet</p>
                  )}
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg font-bold text-[#1A0A0E] dark:text-gray-100 mb-4">Top Products</h2>
                <div className="space-y-3">
                  {stats.topProducts.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-300 dark:text-gray-600 w-4 shrink-0">{i + 1}</span>
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-9 h-9 rounded-xl object-cover bg-gray-100 dark:bg-gray-700 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{p.sold} units sold</p>
                      </div>
                      <span className="text-xs font-bold text-[#C2185B] shrink-0">
                        Rs. {Math.round(p.revenue / 1000)}K
                      </span>
                    </div>
                  ))}
                  {stats.topProducts.length === 0 && (
                    <p className="text-sm text-gray-400 dark:text-gray-500">No sales data yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Nav */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { href: '/admin', icon: <Package size={16} />, label: 'Products' },
                { href: '/admin/orders', icon: <ShoppingBag size={16} />, label: 'Orders' },
                { href: '/admin/coupons', icon: <Tag size={16} />, label: 'Coupons' },
              ].map(({ href, icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-rose-200 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-[#C2185B] dark:hover:text-rose-400 transition-all"
                >
                  {icon} {label}
                </Link>
              ))}
              <div className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-sm font-semibold text-gray-400 dark:text-gray-500">
                <Clock size={16} /> Today: {stats.todayOrders} orders
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-24 text-gray-400 dark:text-gray-500">Failed to load stats</div>
        )}
      </div>
    </div>
  );
}
