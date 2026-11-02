import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseAvailable } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

import { getLocalOrderById } from '@/lib/localOrders';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const { id } = await params;

    if (await isSupabaseAvailable()) {
      try {
        const { data: order, error } = await supabase
          .from('Order')
          .select('*, orderItems:OrderItem(*)')
          .eq('id', id)
          .single();

        if (!error && order) {
          if (order.userId !== user.id && !user.isAdmin) {
            return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
          }
          return NextResponse.json({
            ...toClient(order),
            shippingAddress: {
              address: order.address, city: order.city,
              postalCode: order.postalCode, country: order.country,
            },
            orderItems: (order.orderItems || []).map(toClient),
          });
        }
      } catch {
        // Supabase is offline, try local store
      }
    }

    const local = getLocalOrderById(id);
    if (local) {
      if (local.userId !== user.id && !user.isAdmin) {
        return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
      }
      return NextResponse.json({
        ...toClient(local),
        shippingAddress: {
          address: local.address, city: local.city,
          postalCode: local.postalCode, country: local.country,
        },
        orderItems: local.orderItems.map(toClient),
      });
    }

    return NextResponse.json({ message: 'Order not found' }, { status: 404 });
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
