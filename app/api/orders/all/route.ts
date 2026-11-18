import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

import { commerceError } from '@/lib/commerce';
import { AdminOrderQuerySchema } from '@/lib/adminOrders';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const query = AdminOrderQuerySchema.parse(Object.fromEntries(params));
    const { data, error } = await supabase.rpc('commerce_admin_orders', {
      p_actor_id: user.id, p_page: query.page, p_page_size: query.pageSize,
      p_status: query.status, p_search: query.search,
    });
    if (error) throw error;
    if (!data || !Array.isArray(data.orders)) throw new Error('Order reporting returned no data');
    return NextResponse.json({ ...data, orders: data.orders.map(toClient) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const result = commerceError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}
