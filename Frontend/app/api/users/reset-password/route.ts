import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { hashAccountToken } from '@/lib/accountTokens';
import { rateLimit } from '@/lib/rateLimit';

const input = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(6, 'Password must be at least 6 characters.').refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes.'),
});

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'reset-password', 10, 900);
    if (limited) return limited;
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.path[0] === 'password' ? parsed.error.issues[0].message : 'Invalid reset link. Request a new password reset email.' }, { status: 400 });
    const { token, password } = parsed.data;
    const { data: changed, error } = await supabase.rpc('reset_account_password', {
      p_token_hash: hashAccountToken(token),
      p_password_hash: await bcrypt.hash(password, 12),
    });
    if (error) {
      console.error('[password-reset] Password update failed:', error.code);
      return NextResponse.json({ message: 'Password reset is temporarily unavailable. Please try again later.' }, { status: 503 });
    }
    if (changed !== true) return NextResponse.json({ message: 'This reset link has expired or has already been used. Request a new one.' }, { status: 400 });
    return NextResponse.json({ message: 'Your password has been reset. Sign in with your new password.' });
  } catch {
    return NextResponse.json({ message: 'Password reset is temporarily unavailable. Please try again later.' }, { status: 503 });
  }
}
