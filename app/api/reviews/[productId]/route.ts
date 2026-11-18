import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { toClient } from '@/lib/auth';
import { readAllRows } from '@/lib/pagination';
import { commerceError } from '@/lib/commerce';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const data = await readAllRows((from, to) => supabase
      .from('Review')
      .select('*', { count: 'exact' })
      .eq('productId', productId)
      .order('createdAt', { ascending: false })
      .order('id', { ascending: false }).range(from, to));

    return NextResponse.json((data || []).map(toClient));
  } catch (e) {
    const result = commerceError(e);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}
