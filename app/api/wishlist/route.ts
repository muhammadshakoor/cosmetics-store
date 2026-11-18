import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Sign in to view your account wishlist.' }, { status: 401 });
    const { data, error } = await supabase.from('Wishlist').select('id, productId, Product(*)').eq('userId', user.id).limit(200);
    if (error) return NextResponse.json({ message: 'Your wishlist is temporarily unavailable.' }, { status: 503 });
    return NextResponse.json((data || []).map((item) => {
      const relation = item.Product as unknown as Record<string, unknown> | Record<string, unknown>[] | null;
      const product = Array.isArray(relation) ? relation[0] : relation;
      return { id: item.id, productId: item.productId, product: product ? { ...product, _id: product.id } : null };
    }));
  } catch {
    return NextResponse.json({ message: 'Your wishlist is temporarily unavailable.' }, { status: 503 });
  }
}
const input = z.object({ productId: z.string().trim().min(1).max(120), wishlisted: z.boolean().optional() });
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Sign in again to save your wishlist.' }, { status: 401 });
    const limited = await rateLimit(request, 'wishlist', 60, 60);
    if (limited) return limited;
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: 'Choose a valid product.' }, { status: 400 });
    const { productId } = parsed.data;
    const { data, error } = await supabase.rpc('set_account_wishlist', {
      p_user_id: user.id, p_product_id: productId, p_wishlisted: parsed.data.wishlisted ?? null,
    });
    if (error) {
      if (error.message === 'WISHLIST_PRODUCT') return NextResponse.json({ message: 'This product is no longer available.' }, { status: 404 });
      if (error.message === 'WISHLIST_FULL') return NextResponse.json({ message: 'Your wishlist can hold up to 200 products.' }, { status: 409 });
      return NextResponse.json({ message: 'Your wishlist could not be saved. Please try again.' }, { status: 503 });
    }
    if (typeof data?.wishlisted !== 'boolean') return NextResponse.json({ message: 'Your wishlist could not be saved. Please try again.' }, { status: 503 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Your wishlist could not be saved. Please try again.' }, { status: 503 });
  }
}
