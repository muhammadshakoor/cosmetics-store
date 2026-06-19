import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json([]);

  const { data } = await supabase
    .from('Wishlist')
    .select('id, productId, Product(*)')
    .eq('userId', user.id);

  return NextResponse.json(
    data?.map((w) => {
      const arr = w.Product as unknown as Record<string, unknown>[] | null;
      const p = Array.isArray(arr) ? arr[0] ?? null : null;
      return {
        id: w.id,
        productId: w.productId,
        product: p ? { ...p, _id: p.id } : null,
      };
    }) || []
  );
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

  const { productId } = await request.json();
  if (!productId) return NextResponse.json({ message: 'productId required' }, { status: 400 });

  const { data: existing } = await supabase
    .from('Wishlist')
    .select('id')
    .eq('userId', user.id)
    .eq('productId', productId)
    .maybeSingle();

  if (existing) {
    await supabase.from('Wishlist').delete().eq('id', existing.id);
    return NextResponse.json({ wishlisted: false });
  }

  await supabase.from('Wishlist').insert({
    id: crypto.randomUUID(),
    userId: user.id,
    productId,
  });

  return NextResponse.json({ wishlisted: true });
}
