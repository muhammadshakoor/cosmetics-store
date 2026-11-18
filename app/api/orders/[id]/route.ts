import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { commerceError } from '@/lib/commerce';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
    const { id } = await params;
    const { data: order, error } = await supabase.from('Order').select('*, orderItems:OrderItem(*)').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    if (order.userId !== user.id && !user.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 403 });
    let reviewedProductIds: string[] | null = [];
    if (order.userId === user.id && order.status === 'delivered') {
      const productIds = [...new Set((order.orderItems || []).map((item: { productId: string }) => item.productId))];
      if (productIds.length) {
        // Reviews are unique per customer and product, including repeat purchases.
        // A failed review lookup must not hide the customer's tracking or receipt.
        try {
          const { data: reviews, error: reviewError } = await supabase.from('Review').select('productId')
            .eq('userId', user.id).in('productId', productIds).limit(productIds.length);
          reviewedProductIds = reviewError ? null : (reviews || []).map((review: { productId: string }) => review.productId);
        } catch { reviewedProductIds = null; }
      }
    }
    return NextResponse.json({
      ...toClient(order),
      shippingAddress: { address: order.address, city: order.city, postalCode: order.postalCode, country: order.country },
      orderItems: (order.orderItems || []).map(toClient),
      reviewedProductIds,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const result = commerceError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}
