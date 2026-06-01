import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Login to write a review' }, { status: 401 });

    const { productId, orderId, rating, comment } = await request.json();

    // Check user has a delivered order containing this product
    const { data: orderItem } = await supabase
      .from('OrderItem')
      .select('orderId, order:Order!inner(userId, isDelivered)')
      .eq('productId', productId)
      .eq('orderId', orderId)
      .single();

    const order = orderItem?.order as { userId: string; isDelivered: boolean } | undefined;
    if (!order?.isDelivered || order.userId !== user.id) {
      return NextResponse.json({ message: 'You can only review products from delivered orders' }, { status: 400 });
    }

    // Check if already reviewed
    const { data: existing } = await supabase
      .from('Review')
      .select('id')
      .eq('userId', user.id)
      .eq('productId', productId)
      .single();

    if (existing) return NextResponse.json({ message: 'You already reviewed this product' }, { status: 400 });

    const { data: review, error } = await supabase
      .from('Review')
      .insert({
        id: crypto.randomUUID(),
        userId: user.id,
        productId,
        orderId,
        rating,
        comment,
        name: user.name,
        createdAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Update product avg rating
    const { data: reviews } = await supabase.from('Review').select('rating').eq('productId', productId);
    if (reviews?.length) {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      await supabase.from('Product').update({ rating: Math.round(avg * 10) / 10, numReviews: reviews.length }).eq('id', productId);
    }

    return NextResponse.json(toClient(review), { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
