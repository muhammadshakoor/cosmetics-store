import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const { orderItems, shippingAddress, paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice } = await request.json();
    if (!orderItems?.length) return NextResponse.json({ message: 'No order items' }, { status: 400 });

    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data: order, error: orderError } = await supabase
      .from('Order')
      .insert({
        id: orderId, userId: user.id,
        address: shippingAddress.address, city: shippingAddress.city,
        postalCode: shippingAddress.postalCode, country: shippingAddress.country,
        paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice,
        isPaid: false, isDelivered: false,
        createdAt: now, updatedAt: now,
      })
      .select().single();

    if (orderError) throw new Error(orderError.message);

    const items = orderItems.map((item: { name: string; qty: number; image: string; price: number; _id: string }) => ({
      id: crypto.randomUUID(),
      orderId, productId: item._id,
      name: item.name, qty: item.qty, image: item.image, price: item.price,
    }));

    const { error: itemsError } = await supabase.from('OrderItem').insert(items);
    if (itemsError) throw new Error(itemsError.message);

    return NextResponse.json(toClient(order), { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
