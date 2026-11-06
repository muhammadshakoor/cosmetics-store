import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getAuthUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { deliverRestockAlerts } from '@/lib/restock';

async function processPending() {
  // Bound each run; unsent alerts remain in the database for the next run.
  const { data, error } = await supabase.from('RestockSubscription').select('productId,Product!inner(countInStock)').eq('active', true).is('notifiedAt', null).gt('Product.countInStock', 0).order('createdAt').limit(100);
  if (error) return NextResponse.json({ message: 'Notification storage is unavailable.' }, { status: 503 });
  const ids = [...new Set((data || []).map((row: { productId: string }) => row.productId))].slice(0, 5);
  if (ids.length) {
    const { data: products, error: productError } = await supabase.from('Product').select('id,name,countInStock').in('id', ids).gt('countInStock', 0);
    if (productError) return NextResponse.json({ message: 'Product storage is unavailable.' }, { status: 503 });
    await Promise.all((products || []).map((product) => deliverRestockAlerts(product)));
  }
  await supabase.from('RateLimitBucket').delete().lt('expiresAt', new Date(Date.now() - 86400000).toISOString());
  return NextResponse.json({ message: 'Pending restock alerts processed.' });
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get('authorization') || '';
  const expected = secret ? `Bearer ${secret}` : '';
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  if (!expected || providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
  return processPending();
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
  return processPending();
}
