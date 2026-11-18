import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'restock', 5, 900);
  if (limited) return limited;
  const parsed = z.object({ email: z.string().trim().email().max(254).toLowerCase(), productId: z.string().min(1).max(100) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'Enter a valid email address and product.' }, { status: 400 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ message: 'Email alerts are currently unavailable. Please check back later.' }, { status: 503 });
  const { data: product, error: productError } = await supabase.from('Product').select('id,countInStock').eq('id', parsed.data.productId).maybeSingle();
  if (productError) return NextResponse.json({ message: 'We could not check this product. Please try again.' }, { status: 503 });
  if (!product) return NextResponse.json({ message: 'Product not found.' }, { status: 404 });
  if (product.countInStock > 0) return NextResponse.json({ message: 'This product is available now. Refresh to see current stock.' }, { status: 409 });
  const { data: existing, error: lookupError } = await supabase.from('RestockSubscription').select('id,active,notifiedAt').eq('email', parsed.data.email).eq('productId', parsed.data.productId).maybeSingle();
  if (lookupError) return NextResponse.json({ message: 'Your alert could not be saved. Please try again later.' }, { status: 503 });
  const payload = { ...parsed.data, active: true, unsubscribeToken: randomBytes(32).toString('hex'), notifiedAt: null, leaseUntil: null };
  const { error } = existing
    ? (existing.active && !existing.notifiedAt ? { error: null } : await supabase.from('RestockSubscription').update(payload).eq('id', existing.id))
    : await supabase.from('RestockSubscription').upsert({ id: crypto.randomUUID(), ...payload }, { onConflict: 'email,productId', ignoreDuplicates: true });
  if (error) return NextResponse.json({ message: 'Your alert could not be saved. Please try again later.' }, { status: 503 });
  return NextResponse.json({ message: 'Your alert has been saved. We will email you when stock becomes available.' });
}
