import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // select('*') so a missing optional column (e.g. isCancelled) can't make the whole query fail
  const { data: orders } = await supabase.from('Order').select('*');

  const allOrders = (orders || []) as { id: string; totalPrice: number; status?: string; isCancelled?: boolean; createdAt: string }[];
  const isCancelled = (o: { status?: string; isCancelled?: boolean }) => o.status === 'cancelled' || Boolean(o.isCancelled);
  const activeOrders = allOrders.filter((o) => !isCancelled(o));
  const activeOrderIds = new Set(activeOrders.map((o) => o.id));

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
    const key = isCancelled(o) ? 'cancelled' : (o.status || 'confirmed');
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  }

  // Monthly revenue — last 6 months
  const monthlyRevenue: Record<string, number> = {};
  for (const o of activeOrders) {
    const month = (o.createdAt as string).slice(0, 7);
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + o.totalPrice;
  }

  // Top products + category breakdown
  const { data: allItems } = await supabase
    .from('OrderItem')
    .select('orderId, productId, name, qty, price, Product(image)');
  // Cancelled orders don't count towards product or category sales
  const items = (allItems || []).filter((item) => activeOrderIds.has(item.orderId));

  const productRevenue: Record<string, { name: string; image: string; revenue: number; sold: number }> = {};
  for (const item of items) {
    if (!productRevenue[item.productId]) {
      productRevenue[item.productId] = {
        name: item.name,
        // Many-to-one joins come back as an object (older clients returned an array)
        image: (() => {
          const joined = item.Product as unknown as { image: string } | { image: string }[] | null;
          return (Array.isArray(joined) ? joined[0]?.image : joined?.image) ?? '';
        })(),
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
  for (const item of items) {
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
