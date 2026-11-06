import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { rateLimit } from '@/lib/rateLimit';

const input = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(254).toLowerCase(), subject: z.enum(['order', 'product', 'return', 'delivery', 'other']), message: z.string().trim().min(10).max(5000) });

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'contact', 5, 900);
  if (limited) return limited;
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  const id = crypto.randomUUID();
  const { name, email, subject, message } = parsed.data;
  const { error } = await supabase.from('Complaint').insert({ id, userId: null, name, email, category: subject, subject: `Contact: ${subject}`, message, status: 'open', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  if (error) return NextResponse.json({ message: 'Your message could not be saved. Please try again later.' }, { status: 503 });
  return NextResponse.json({ message: 'Your message has been saved for our support team.', reference: id.slice(-8).toUpperCase() }, { status: 201 });
}
