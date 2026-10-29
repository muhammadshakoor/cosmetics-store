import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, escapeHtml } from '@/lib/email';

const SUBJECTS: Record<string, string> = {
  order: 'Order Issue',
  product: 'Product Question',
  return: 'Return / Refund',
  delivery: 'Delivery Issue',
  other: 'Other',
};

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message, website } = await request.json();

    // Honeypot: real visitors never see or fill this field
    if (website) return NextResponse.json({ message: 'Message sent.' });

    if (!name?.trim() || !email?.trim() || !subject || !message?.trim()) {
      return NextResponse.json({ message: 'Please fill in all required fields.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (name.length > 100 || message.length > 5000) {
      return NextResponse.json({ message: 'Your message is too long.' }, { status: 400 });
    }

    const inbox = process.env.CONTACT_EMAIL || process.env.ADMIN_EMAIL;
    const topic = SUBJECTS[subject] || 'Other';
    const sent = inbox && await sendEmail(
      inbox,
      `Contact form: ${topic} — ${name.trim()}`,
      `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#C2185B">New message from the website</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#888;width:120px">From</td><td><strong>${escapeHtml(name.trim())}</strong> (${escapeHtml(email.trim())})</td></tr>
          <tr><td style="padding:6px 0;color:#888">Topic</td><td>${escapeHtml(topic)}</td></tr>
        </table>
        <div style="margin-top:16px;padding:16px;background:#fdf2f6;border-radius:8px;font-size:14px;color:#333;line-height:1.6">
          ${escapeHtml(message.trim()).replace(/\n/g, '<br/>')}
        </div>
        <p style="margin-top:16px;font-size:12px;color:#aaa">Reply to this email to answer the customer directly.</p>
      </div>`,
      email.trim(),
    );

    if (!sent) {
      return NextResponse.json(
        { message: 'We couldn’t send your message right now. Please reach us on WhatsApp instead.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ message: 'Message sent.' });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
