import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { commerceError } from '@/lib/commerce';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
    // Aggregate inside PostgreSQL; REST row limits cannot truncate totals.
    const { data, error } = await supabase.rpc('commerce_admin_stats', { p_actor_id: user.id });
    if (error) throw error;
    if (!data) throw new Error('Reporting returned no data');
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const result = commerceError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}
