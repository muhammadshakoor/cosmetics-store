import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('Order')
      .select('*, orderItems:OrderItem(*)')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json((data || []).map(toClient));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
