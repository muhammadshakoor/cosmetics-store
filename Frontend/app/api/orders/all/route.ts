import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseAvailable } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

import { getAllLocalOrders } from '@/lib/localOrders';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });

    if (await isSupabaseAvailable()) {
      try {
        const { data, error } = await supabase
          .from('Order')
          .select('*, orderItems:OrderItem(*), user:User(name, email)')
          .order('createdAt', { ascending: false });

        if (!error && data && data.length > 0) {
          return NextResponse.json(data.map(toClient));
        }
      } catch {
        // Supabase is offline, try local store
      }
    }

    const localOrders = getAllLocalOrders();
    return NextResponse.json(localOrders.map(toClient));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
