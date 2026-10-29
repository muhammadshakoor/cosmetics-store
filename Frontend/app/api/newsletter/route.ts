import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, escapeHtml } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
    }
    const subscriber = String(email).trim().toLowerCase();
    console.log('[Newsletter] New subscriber:', subscriber);

    // There's no subscribers table yet, so forward each sign-up to the store inbox
    const inbox = process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL;
    if (inbox) {
      sendEmail(
        inbox,
        'New newsletter subscriber — Lumina',
        `<p style="font-family:sans-serif;font-size:14px">New newsletter subscriber: <strong>${escapeHtml(subscriber)}</strong></p>`,
      ).catch(() => {});
    }

    return NextResponse.json({ message: 'Subscribed successfully!' });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
