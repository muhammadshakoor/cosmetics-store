import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { escapeHtml } from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Lumina Store <noreply@resend.dev>';

async function sendVerificationEmail(to: string, name: string, token: string) {
  if (!RESEND_KEY) return;
  const link = `${SITE_URL}/verify-email?token=${token}`;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject: 'Verify your Lumina account ✨',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0e8ea">
          <div style="background:linear-gradient(135deg,#C2185B,#e91e8c);padding:36px 24px;text-align:center">
            <div style="width:48px;height:48px;background:rgba(255,255,255,0.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
              <span style="color:#fff;font-size:22px;font-weight:bold">L</span>
            </div>
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800">Welcome to Lumina!</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px">Hi ${escapeHtml(name)}, one quick step to get started</p>
          </div>
          <div style="padding:36px 24px;text-align:center">
            <p style="color:#444;font-size:15px;line-height:1.6;margin-top:0">
              Please verify your email address to activate your account and start shopping.
              This link will expire in <strong>24 hours</strong>.
            </p>
            <a href="${link}" style="display:inline-block;margin:24px 0;background:#C2185B;color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">
              Verify My Email
            </a>
            <p style="color:#999;font-size:12px;margin-top:8px">
              If you did not create a Lumina account, you can safely ignore this email.
            </p>
            <div style="margin-top:24px;padding-top:16px;border-top:1px solid #f5f5f5">
              <p style="color:#bbb;font-size:11px;word-break:break-all">Link not working? Copy this URL:<br/>${link}</p>
            </div>
          </div>
          <div style="background:#fdf2f6;padding:16px 24px;text-align:center;font-size:12px;color:#aaa">
            &copy; Lumina Cosmetics
          </div>
        </div>
      `,
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name?.trim() || !email?.trim() || !password)
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });

    if (password.length < 6)
      return NextResponse.json({ message: 'Password must be at least 6 characters' }, { status: 400 });

    const normalizedEmail = email.toLowerCase().trim();

    const { data: existing } = await supabase
      .from('User').select('id').eq('email', normalizedEmail).single();
    if (existing)
      return NextResponse.json({ message: 'An account with this email already exists' }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const verifyToken = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const { error } = await supabase.from('User').insert({
      id,
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      isAdmin: false,
      emailVerified: false,
      verifyToken,
      verifyTokenExpiry: expiry,
      createdAt: now,
      updatedAt: now,
    });

    if (error) throw new Error(error.message);

    // Non-blocking — registration still succeeds even if email fails
    sendVerificationEmail(normalizedEmail, name.trim(), verifyToken).catch(() => {});

    return NextResponse.json({ emailSent: true, email: normalizedEmail }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
