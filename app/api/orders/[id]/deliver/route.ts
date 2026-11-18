import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { commerceError } from '@/lib/commerce';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });
    const { id } = await params;
    const { data, error } = await supabase.rpc('checkout_transition_order', { p_order_id: id, p_actor_id: user.id, p_status: 'delivered' });
    if (error) throw error;
    return NextResponse.json(toClient(data));
  } catch (error) {
    const result = commerceError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}
