import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

const input = z.object({ productIds: z.array(z.string().trim().min(1).max(120)).max(200) });

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Sign in again to save your wishlist.' }, { status: 401 });
    const limited = await rateLimit(request, 'wishlist-merge', 10, 60);
    if (limited) return limited;
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ message: 'Choose up to 200 valid products.' }, { status: 400 });
    const { data, error } = await supabase.rpc('merge_account_wishlist', {
      p_user_id: user.id, p_product_ids: [...new Set(parsed.data.productIds)],
    });
    if (error || !data) return NextResponse.json({ message: 'Your saved items could not be merged. Please retry.' }, { status: 503 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'Your saved items could not be merged. Please retry.' }, { status: 503 });
  }
}
