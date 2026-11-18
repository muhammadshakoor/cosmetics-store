import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { z } from 'zod';
import { commerceError } from '@/lib/commerce';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
    const { id } = await params;
    const { reason } = z.object({ reason: z.string().trim().max(500).optional() }).parse(await request.json());
    const { data, error } = await supabase.rpc('checkout_transition_order', {
      p_order_id: id, p_actor_id: user.id, p_status: 'cancelled', p_reason: reason || 'Cancelled by customer',
    });
    if (error) throw error;
    return NextResponse.json(toClient(data));
  } catch (error) {
    const result = commerceError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}
