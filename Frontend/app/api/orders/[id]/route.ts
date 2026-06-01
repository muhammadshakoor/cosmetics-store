import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const { id } = await params;
    const { data: order, error } = await supabase
      .from('Order')
      .select('*, orderItems:OrderItem(*)')
      .eq('id', id)
      .single();

    if (error || !order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    if (order.userId !== user.id && !user.isAdmin)
      return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    return NextResponse.json({
      ...toClient(order),
      shippingAddress: {
        address: order.address, city: order.city,
        postalCode: order.postalCode, country: order.country,
      },
      orderItems: (order.orderItems || []).map(toClient),
    });
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
