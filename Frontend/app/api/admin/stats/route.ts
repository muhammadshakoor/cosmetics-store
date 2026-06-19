import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: orders } = await supabase
    .from('Order')
    .select('id, totalPrice, status, isCancelled, createdAt');

  const allOrders = orders || [];
  const activeOrders = allOrders.filter((o) => !o.isCancelled);

  const totalRevenue = activeOrders.reduce((s, o) => s + o.totalPrice, 0);
  const monthRevenue = activeOrders
    .filter((o) => o.createdAt >= startOfMonth)
    .reduce((s, o) => s + o.totalPrice, 0);
  const todayRevenue = activeOrders
    .filter((o) => o.createdAt >= startOfToday)
    .reduce((s, o) => s + o.totalPrice, 0);
  const todayOrders = allOrders.filter((o) => o.createdAt >= startOfToday).length;

  const statusCounts: Record<string, number> = {};
  for (const o of allOrders) {
    const key = o.isCancelled ? 'cancelled' : (o.status || 'confirmed');
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  }

  // Monthly revenue — last 6 months
  const monthlyRevenue: Record<string, number> = {};
  for (const o of activeOrders) {
    const month = (o.createdAt as string).slice(0, 7);
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + o.totalPrice;
  }

  // Top products + category breakdown
  const { data: items } = await supabase
    .from('OrderItem')
    .select('productId, name, qty, price, Product(image)');

  const productRevenue: Record<string, { name: string; image: string; revenue: number; sold: number }> = {};
  for (const item of items || []) {
    if (!productRevenue[item.productId]) {
      productRevenue[item.productId] = {
        name: item.name,
        image: (item.Product as unknown as Array<{ image: string }>)?.[0]?.image ?? '',
        revenue: 0,
        sold: 0,
      };
    }
    productRevenue[item.productId].revenue += item.price * item.qty;
    productRevenue[item.productId].sold += item.qty;
  }

  const topProducts = Object.entries(productRevenue)
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([id, d]) => ({ id, ...d }));

  const { data: products } = await supabase.from('Product').select('id, category');
  const catMap: Record<string, string> = {};
  for (const p of products || []) catMap[p.id] = p.category;

  const categoryRevenue: Record<string, number> = {};
  for (const item of items || []) {
    const cat = catMap[item.productId] || 'other';
    categoryRevenue[cat] = (categoryRevenue[cat] || 0) + item.price * item.qty;
  }

  return NextResponse.json({
    totalRevenue,
    monthRevenue,
    todayRevenue,
    totalOrders: allOrders.length,
    todayOrders,
    statusCounts,
    monthlyRevenue,
    topProducts,
    categoryRevenue,
  });
}
