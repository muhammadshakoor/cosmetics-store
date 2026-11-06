import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

  const now = new Date();
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const startOfToday = new Date(`${localDate}T00:00:00+05:00`).toISOString();
  const startOfMonth = new Date(`${localDate.slice(0, 7)}-01T00:00:00+05:00`).toISOString();

  const { data: orders, error: ordersError } = await supabase
    .from('Order')
    .select('id, totalPrice, status, isCancelled, isPaid, createdAt');

  if (ordersError) return NextResponse.json({ message: 'Order reporting is temporarily unavailable.' }, { status: 503 });

  const allOrders = orders || [];
  const activeOrders = allOrders.filter((o) => !o.isCancelled && o.status !== 'cancelled' && o.isPaid);
  const paidIds = new Set(activeOrders.map((order) => order.id));

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
    const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi', year: 'numeric', month: '2-digit' }).format(new Date(o.createdAt));
    monthlyRevenue[month] = (monthlyRevenue[month] || 0) + o.totalPrice;
  }

  // Top products + category breakdown
  const { data: items, error: itemsError } = await supabase
    .from('OrderItem')
    .select('orderId, productId, name, qty, price, Product(image)');
  if (itemsError) return NextResponse.json({ message: 'Sales reporting is temporarily unavailable.' }, { status: 503 });
  const paidItems = (items || []).filter((item) => paidIds.has(item.orderId));

  const productRevenue: Record<string, { name: string; image: string; revenue: number; sold: number }> = {};
  for (const item of paidItems) {
    if (!productRevenue[item.productId]) {
      productRevenue[item.productId] = {
        name: item.name,
        image: (Array.isArray(item.Product) ? item.Product[0] : item.Product)?.image ?? '',
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

  const { data: products, error: productsError } = await supabase.from('Product').select('id, category');
  if (productsError) return NextResponse.json({ message: 'Product reporting is temporarily unavailable.' }, { status: 503 });
  const catMap: Record<string, string> = {};
  for (const p of products || []) catMap[p.id] = p.category;

  const categoryRevenue: Record<string, number> = {};
  for (const item of paidItems) {
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
