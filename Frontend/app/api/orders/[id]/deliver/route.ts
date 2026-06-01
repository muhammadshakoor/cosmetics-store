import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });

    const { id } = await params;
    const { data, error } = await supabase
      .from('Order')
      .update({ isDelivered: true, deliveredAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(toClient(data));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
