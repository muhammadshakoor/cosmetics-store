import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'unsubscribe', 30, 600);
  if (limited) return limited;
  const parsed = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'This unsubscribe link is invalid.' }, { status: 400 });
  const results = await Promise.all(['NewsletterSubscriber', 'RestockSubscription'].map((table) => supabase.from(table).update({ active: false }).eq('unsubscribeToken', parsed.data.token)));
  if (results.some((result) => result.error)) return NextResponse.json({ message: 'We could not update your preference. Please try again.' }, { status: 503 });
  return NextResponse.json({ message: 'You have been unsubscribed from this notification.' });
}
