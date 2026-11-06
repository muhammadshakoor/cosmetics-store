import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

import { commerceError } from '@/lib/commerce';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const { data, error } = await supabase.from('Order').select('*, orderItems:OrderItem(*)').eq('userId', user.id).order('createdAt', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data || []).map(toClient));
  } catch (error) {
    const result = commerceError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}
