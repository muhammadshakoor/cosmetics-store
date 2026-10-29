import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { escapeHtml } from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Lumina Store <noreply@resend.dev>';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email)
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });

    const { data: user } = await supabase
      .from('User')
      .select('id, name, emailVerified')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Always return success to avoid revealing whether an account exists
    if (!user || user.emailVerified) {
      return NextResponse.json({ message: 'If that email is registered and unverified, a new link has been sent.' });
    }

    const verifyToken = crypto.randomUUID();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await supabase.from('User').update({
      verifyToken,
      verifyTokenExpiry: expiry,
      updatedAt: new Date().toISOString(),
    }).eq('id', user.id);

    if (RESEND_KEY) {
      const link = `${SITE_URL}/verify-email?token=${verifyToken}`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email.toLowerCase().trim(),
          subject: 'New verification link — Lumina',
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0e8ea">
              <div style="background:linear-gradient(135deg,#C2185B,#e91e8c);padding:32px 24px;text-align:center">
                <h1 style="color:#fff;margin:0;font-size:22px;font-weight:800">Verify Your Email</h1>
                <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">Hi ${escapeHtml(user.name)}, here is your new verification link</p>
              </div>
              <div style="padding:32px 24px;text-align:center">
                <p style="color:#555;font-size:15px">This new link expires in <strong>24 hours</strong>.</p>
                <a href="${link}" style="display:inline-block;margin:24px 0;background:#C2185B;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">
                  Verify My Email
                </a>
                <p style="color:#bbb;font-size:11px;word-break:break-all">Or copy: ${link}</p>
              </div>
              <div style="background:#fdf2f6;padding:16px 24px;text-align:center;font-size:12px;color:#aaa">
                &copy; Lumina Cosmetics
              </div>
            </div>
          `,
        }),
      });
    }

    return NextResponse.json({ message: 'If that email is registered and unverified, a new link has been sent.' });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
