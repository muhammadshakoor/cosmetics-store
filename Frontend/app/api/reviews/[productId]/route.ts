import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { toClient } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const { data, error } = await supabase
      .from('Review')
      .select('*')
      .eq('productId', productId)
      .order('createdAt', { ascending: false });

    if (error) throw new Error(error.message);
    return NextResponse.json((data || []).map(toClient));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
