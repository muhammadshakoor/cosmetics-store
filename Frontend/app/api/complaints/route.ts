import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { sendEmail, escapeHtml } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { name, email, orderId, category, subject, message } = await request.json();

    if (!name || !email || !category || !subject || !message) {
      return NextResponse.json({ message: 'All required fields must be filled.' }, { status: 400 });
    }

    const user = await getAuthUser(request).catch(() => null);
    const now = new Date().toISOString();

    const { data: complaint, error } = await supabase.from('Complaint').insert({
      id: crypto.randomUUID(),
      userId: user?.id || null,
      name,
      email,
      orderId: orderId || null,
      category,
      subject,
      message,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    }).select().single();

    if (error) throw new Error(error.message);

    notifyAdmin(complaint, name, email, orderId, category, subject, message).catch(() => {});
    confirmUser(email, name, subject).catch(() => {});

    return NextResponse.json({ message: 'Complaint submitted successfully.' }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

  if (user.isAdmin) {
    // Admin sees all complaints
    const { data, error } = await supabase
      .from('Complaint')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Regular user sees only their own complaints
  const { data, error } = await supabase
    .from('Complaint')
    .select('*')
    .eq('userId', user.id)
    .order('createdAt', { ascending: false });
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

async function notifyAdmin(
  complaint: { id: string },
  name: string, email: string,
  orderId: string, category: string, subject: string, message: string
) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  await sendEmail(
    adminEmail,
    `New Complaint: ${subject} — Lumina`,
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#C2185B">New Customer Complaint</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#888;width:120px">From</td><td><strong>${escapeHtml(name)}</strong> (${escapeHtml(email)})</td></tr>
        <tr><td style="padding:6px 0;color:#888">Category</td><td>${escapeHtml(category)}</td></tr>
        ${orderId ? `<tr><td style="padding:6px 0;color:#888">Order ID</td><td>${escapeHtml(orderId)}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#888">Subject</td><td><strong>${escapeHtml(subject)}</strong></td></tr>
      </table>
      <div style="margin-top:16px;padding:16px;background:#fdf2f6;border-radius:8px;font-size:14px;color:#333;line-height:1.6">
        ${escapeHtml(message).replace(/\n/g, '<br/>')}
      </div>
      <p style="margin-top:16px;font-size:12px;color:#aaa">Complaint ID: ${complaint.id}</p>
    </div>`
  );
}

async function confirmUser(email: string, name: string, subject: string) {
  await sendEmail(
    email,
    'We received your complaint — Lumina',
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0e8ea">
      <div style="background:linear-gradient(135deg,#C2185B,#e91e8c);padding:28px 24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">We got your message, ${escapeHtml(name)}!</h1>
      </div>
      <div style="padding:24px">
        <p style="color:#555;margin-top:0">Thank you for reaching out. We have received your complaint regarding <strong>"${escapeHtml(subject)}"</strong> and our team will review it and get back to you within <strong>24–48 hours</strong>.</p>
        <p style="color:#555">If you have any additional information to share, simply reply to this email.</p>
        <p style="color:#888;font-size:13px;margin-top:24px">— The Lumina Support Team</p>
      </div>
    </div>`
  );
}
