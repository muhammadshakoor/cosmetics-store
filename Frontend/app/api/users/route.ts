import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { RegisterInputSchema } from '@/types/api';
import { sendVerificationEmail } from '@/lib/accountEmails';
import { EmailDeliveryError } from '@/lib/email';
import { createAccountToken, getSiteUrl } from '@/lib/accountTokens';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'register', 10, 900);
    if (limited) return limited;
    const parsed = RegisterInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Invalid input data' }, { status: 400 });
    }
    const { name, email, password } = parsed.data;
    if (Buffer.byteLength(password, 'utf8') > 72) {
      return NextResponse.json({ message: 'Password must be at most 72 UTF-8 bytes.' }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) throw new EmailDeliveryError('Account email is temporarily unavailable. Please try again later.');
    getSiteUrl();
    const { data: existing, error: lookupError } = await supabase.from('User').select('id').eq('email', email).maybeSingle();
    if (lookupError) return NextResponse.json({ message: 'Registration is temporarily unavailable.' }, { status: 503 });
    if (existing) return NextResponse.json({ message: 'An account with this email already exists. Sign in or request a new verification link.' }, { status: 400 });

    const verifyToken = createAccountToken();
    const now = new Date().toISOString();
    const { error } = await supabase.from('User').insert({
      id: crypto.randomUUID(), name, email, password: await bcrypt.hash(password, 12),
      isAdmin: false, emailVerified: false, authVersion: 0, verifyToken,
      verifyTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now, updatedAt: now,
    });
    if (error) {
      console.error('[registration] Account creation failed:', error.code);
      return NextResponse.json({ message: 'Failed to create your account. Please try again.' }, { status: 500 });
    }
    try {
      await sendVerificationEmail(email, name, verifyToken);
    } catch {
      return NextResponse.json({ message: 'Your account was created, but the verification email could not be delivered. Request a new verification link from the sign-in page.', emailSent: false, email }, { status: 503 });
    }
    return NextResponse.json({ emailSent: true, email }, { status: 201 });
  } catch (error) {
    if (error instanceof EmailDeliveryError) return NextResponse.json({ message: error.message }, { status: 503 });
    return NextResponse.json({ message: 'Server error processing registration.' }, { status: 500 });
  }
}
