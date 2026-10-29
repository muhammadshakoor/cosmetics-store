import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { getLocalProductById, updateLocalProduct } from '@/lib/localProducts';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const { id } = await params;
    const { reason } = await request.json().catch(() => ({ reason: 'Cancelled by customer' }));

    const { data: order } = await supabase
      .from('Order')
      .select('*, orderItems:OrderItem(*)')
      .eq('id', id).single();

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    if (order.userId !== user.id && !user.isAdmin)
      return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const cancellableStatuses = ['placed', 'confirmed'];
    if (!cancellableStatuses.includes(order.status)) {
      return NextResponse.json({
        message: `Cannot cancel order that is already "${order.status}". Please contact support.`
      }, { status: 400 });
    }

    // Cancel the order
    const { data: updated, error } = await supabase
      .from('Order')
      .update({
        status: 'cancelled' as never,
        cancelledAt: new Date().toISOString(),
        cancelReason: reason,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id).select().single();

    if (error) throw new Error(error.message);

    // Restore stock
    for (const item of (order.orderItems || [])) {
      const { data: product } = await supabase
        .from('Product').select('countInStock').eq('id', item.productId).single();
      if (product) {
        await supabase.from('Product')
          .update({ countInStock: product.countInStock + item.qty })
          .eq('id', item.productId);
      } else {
        const local = getLocalProductById(item.productId);
        if (local) updateLocalProduct(item.productId, { countInStock: local.countInStock + item.qty });
      }
    }

    return NextResponse.json(toClient(updated));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
