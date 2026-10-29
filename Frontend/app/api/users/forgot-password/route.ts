import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail, escapeHtml } from '@/lib/email';
import { RESET_TOKEN_PREFIX } from '@/lib/auth';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });

    const { data: user } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Same response whether or not the account exists, so emails can't be probed
    const ok = NextResponse.json({ message: 'If an account exists for that email, a reset link has been sent.' });
    if (!user) return ok;

    const token = RESET_TOKEN_PREFIX + crypto.randomUUID();
    await supabase.from('User').update({
      verifyToken: token,
      verifyTokenExpiry: new Date(Date.now() + RESET_TTL_MS).toISOString(),
      updatedAt: new Date().toISOString(),
    }).eq('id', user.id);

    const link = `${SITE_URL}/reset-password?token=${token}`;
    await sendEmail(
      user.email,
      'Reset your Lumina password',
      `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0e8ea">
        <div style="background:linear-gradient(135deg,#C2185B,#e91e8c);padding:28px 24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:22px">Reset your password</h1>
        </div>
        <div style="padding:28px 24px;text-align:center">
          <p style="color:#444;font-size:15px;line-height:1.6;margin-top:0">Hi ${escapeHtml(user.name)}, we received a request to reset your Lumina password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${link}" style="display:inline-block;margin:20px 0;background:#C2185B;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">Choose a new password</a>
          <p style="color:#999;font-size:12px">If you didn't ask for this, you can safely ignore this email — your password won't change.</p>
          <p style="color:#bbb;font-size:11px;word-break:break-all;margin-top:20px">Link not working? Copy this URL:<br/>${link}</p>
        </div>
      </div>`,
    );
    return ok;
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
