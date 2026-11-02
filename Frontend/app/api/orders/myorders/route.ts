import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseAvailable } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

import { getLocalOrdersByUserId } from '@/lib/localOrders';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    if (await isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from('Order')
          .select('*, orderItems:OrderItem(*)')
          .eq('userId', user.id)
          .order('createdAt', { ascending: false });

        if (!error && data && data.length > 0) {
          return NextResponse.json(data.map(toClient));
        }
      } catch {
        // Supabase is offline, try local store
      }
    }

    const localOrders = getLocalOrdersByUserId(user.id);
    return NextResponse.json(localOrders.map(toClient));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
