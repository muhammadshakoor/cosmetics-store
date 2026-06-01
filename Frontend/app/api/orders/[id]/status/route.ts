import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

export type OrderStatus = 'placed' | 'confirmed' | 'picked_up' | 'on_the_way' | 'delivered';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });

    const { id } = await params;
    const { status, trackingNumber, courierService } = await request.json();

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (courierService) updateData.courierService = courierService;

    if (status === 'delivered') {
      updateData.isDelivered = true;
      updateData.deliveredAt = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('Order')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(toClient(data));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
