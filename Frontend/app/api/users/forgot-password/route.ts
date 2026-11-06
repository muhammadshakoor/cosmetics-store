import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { createAccountToken, hashAccountToken, getSiteUrl } from '@/lib/accountTokens';
import { sendPasswordResetEmail } from '@/lib/accountEmails';
import { rateLimit } from '@/lib/rateLimit';

const input = z.object({ email: z.string().trim().email().toLowerCase() });
const message = 'If that address has a Lumina account, you will receive a password reset link. If it does not arrive, try again later or contact support.';

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'forgot-password', 5, 900);
    if (limited) return limited;
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 });
    // Check shared service configuration before looking up an account so a
    // configuration failure has the same response for every email address.
    if (!process.env.RESEND_API_KEY) return NextResponse.json({ message: 'Password reset email is temporarily unavailable. Please try again later.' }, { status: 503 });
    getSiteUrl();

    const { email } = parsed.data;
    const { data: user, error } = await supabase.from('User').select('id, name, resetPasswordTokenHash, resetPasswordTokenExpiry').eq('email', email).maybeSingle();
    if (error) return NextResponse.json({ message: 'Password recovery is temporarily unavailable. Please try again later.' }, { status: 503 });
    if (user) {
      const token = createAccountToken();
      const hash = hashAccountToken(token);
      const { error: updateError } = await supabase.from('User').update({
        resetPasswordTokenHash: hash,
        resetPasswordTokenExpiry: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      }).eq('id', user.id);
      if (updateError) {
        console.error('[password-reset] Could not store reset request:', updateError.code);
      } else {
        try {
          await sendPasswordResetEmail(email, user.name, token);
        } catch {
          console.error('[password-reset] Email delivery failed.');
          await supabase.from('User').update({ resetPasswordTokenHash: null, resetPasswordTokenExpiry: null })
            .eq('id', user.id).eq('resetPasswordTokenHash', hash);
        }
      }
    }
    // Delivery/storage outcomes must not reveal whether this address exists.
    return NextResponse.json({ message }, { status: 202 });
  } catch {
    return NextResponse.json({ message: 'Password recovery is temporarily unavailable. Please try again later.' }, { status: 503 });
  }
}
