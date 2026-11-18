import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

import { commerceError } from '@/lib/commerce';
import { readAllRows } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const orders = await readAllRows<{ id: string }>((from, to) => supabase.from('Order')
      .select('*, orderItems:OrderItem(*)', { count: 'exact' }).eq('userId', user.id)
      .order('createdAt', { ascending: false }).order('id').range(from, to));
    return NextResponse.json(orders.map(toClient));
  } catch (error) {
    const result = commerceError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}
