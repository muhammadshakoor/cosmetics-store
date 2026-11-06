import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'newsletter', 5, 900);
  if (limited) return limited;
  const parsed = z.object({ email: z.string().trim().email().max(254).toLowerCase(), consent: z.literal(true) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: 'Enter a valid email and agree to receive store updates.' }, { status: 400 });
  const { error } = await supabase.from('NewsletterSubscriber').upsert({ email: parsed.data.email, active: true, unsubscribeToken: randomBytes(32).toString('hex'), updatedAt: new Date().toISOString() }, { onConflict: 'email' });
  if (error) return NextResponse.json({ message: 'We could not save your subscription. Please try again later.' }, { status: 503 });
  return NextResponse.json({ message: 'Your subscription has been saved.' });
}
