import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { addLocalComplaint, getLocalComplaints, type LocalComplaint } from '@/lib/localComplaints';
import { ComplaintInputSchema } from '@/lib/complaints';
import { rateLimit } from '@/lib/rateLimit';
import { escapeHtml, sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'complaints', 5, 900);
    if (limited) return limited;
    const parsed = ComplaintInputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Check the complaint details.' }, { status: 400 });
    const user = await getAuthUser(request);
    if (request.headers.has('authorization') && !user) return NextResponse.json({ message: 'Your session has expired. Sign in again.' }, { status: 401 });
    const now = new Date().toISOString();
    const payload: LocalComplaint = { ...parsed.data, id: crypto.randomUUID(), userId: user?.id || null, status: 'open', createdAt: now, updatedAt: now };
    const { data, error } = await supabase.from('Complaint').insert(payload).select().single();
    let complaint: LocalComplaint;
    if (error || !data) {
      if (process.env.NODE_ENV !== 'development') return NextResponse.json({ message: 'Complaints are temporarily unavailable. Your message has not been saved; please try again later.' }, { status: 503 });
      complaint = addLocalComplaint(payload);
    } else complaint = data;
    if (process.env.RESEND_API_KEY) {
      const notifications = [
        sendEmail({ to: complaint.email, subject: 'We received your complaint — Lumina', html: `<p>Hi ${escapeHtml(complaint.name)},</p><p>Your complaint about <strong>${escapeHtml(complaint.subject)}</strong> has been saved for our team to review.</p><p>Reference: ${escapeHtml(complaint.id)}</p>` }),
      ];
      if (process.env.ADMIN_EMAIL) notifications.push(sendEmail({ to: process.env.ADMIN_EMAIL, replyTo: complaint.email, subject: `New complaint: ${complaint.subject}`, html: `<h2>Customer complaint</h2><p>${escapeHtml(complaint.name)} (${escapeHtml(complaint.email)})</p><p>${escapeHtml(complaint.category)} — ${escapeHtml(complaint.subject)}</p><p>Order: ${escapeHtml(complaint.orderId || 'Not supplied')}</p><p>${escapeHtml(complaint.message).replace(/\n/g, '<br/>')}</p><p>Reference: ${escapeHtml(complaint.id)}</p>` }));
      const results = await Promise.allSettled(notifications);
      if (results.some((result) => result.status === 'rejected')) console.warn('[complaints] Complaint saved; an email notification could not be delivered.');
    }
    return NextResponse.json({ id: complaint.id, message: 'Complaint submitted successfully.' }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'We could not save your complaint. Please try again later.' }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
    const userId = user.isAdmin ? undefined : user.id;
    let query = supabase.from('Complaint').select('*').order('createdAt', { ascending: false }).limit(200);
    if (userId) query = query.eq('userId', userId);
    const { data, error } = await query;
    if (error && process.env.NODE_ENV !== 'development') return NextResponse.json({ message: 'Complaints are temporarily unavailable. Please try again later.' }, { status: 503 });
    const remote: LocalComplaint[] = data || [];
    if (process.env.NODE_ENV !== 'development') return NextResponse.json(remote);
    const seen = new Set(remote.map((complaint) => complaint.id));
    const complaints = [...remote, ...getLocalComplaints(userId).filter((complaint) => !seen.has(complaint.id))]
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt)).slice(0, 200);
    return NextResponse.json(complaints);
  } catch {
    return NextResponse.json({ message: 'Complaints are temporarily unavailable. Please try again later.' }, { status: 503 });
  }
}
