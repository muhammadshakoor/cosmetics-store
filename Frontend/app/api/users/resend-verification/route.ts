import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { sendVerificationEmail } from '@/lib/accountEmails';
import { createAccountToken } from '@/lib/accountTokens';
import { EmailDeliveryError } from '@/lib/email';
import { rateLimit } from '@/lib/rateLimit';

const input = z.object({ email: z.string().trim().email().toLowerCase() });
const message = 'If that email is registered and unverified, a new link has been sent.';

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'resend-verification', 5, 900);
    if (limited) return limited;
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 });
    if (!process.env.RESEND_API_KEY) throw new EmailDeliveryError();
    const { email } = parsed.data;
    const { data: user, error } = await supabase.from('User').select('id, name, emailVerified').eq('email', email).maybeSingle();
    if (error) return NextResponse.json({ message: 'Verification is temporarily unavailable.' }, { status: 503 });
    if (!user || user.emailVerified) return NextResponse.json({ message });

    const verifyToken = createAccountToken();
    const { error: updateError } = await supabase.from('User').update({
      verifyToken, verifyTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), updatedAt: new Date().toISOString(),
    }).eq('id', user.id);
    if (updateError) return NextResponse.json({ message: 'Verification is temporarily unavailable.' }, { status: 503 });
    await sendVerificationEmail(email, user.name, verifyToken);
    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof EmailDeliveryError) return NextResponse.json({ message: error.message }, { status: 503 });
    return NextResponse.json({ message: 'Verification is temporarily unavailable. Please try again later.' }, { status: 500 });
  }
}
