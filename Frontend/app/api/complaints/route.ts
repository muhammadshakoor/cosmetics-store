import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { addLocalComplaint, getLocalComplaints, type LocalComplaint } from '@/lib/localComplaints';
import { ComplaintInputSchema } from '@/lib/complaints';
import { rateLimit } from '@/lib/rateLimit';
import { escapeHtml, sendEmail } from '@/lib/email';
import { ComplaintListQuerySchema, paginateComplaints, type ComplaintRecord } from '@/lib/complaintInbox';
import { readAllRows } from '@/lib/pagination';

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
    let emailSent = false;
    if (process.env.RESEND_API_KEY) {
      const notifications = [
        sendEmail({ to: complaint.email, subject: 'We received your complaint — Lumina', html: `<p>Hi ${escapeHtml(complaint.name)},</p><p>Your complaint about <strong>${escapeHtml(complaint.subject)}</strong> has been saved for our team to review.</p><p>Reference: ${escapeHtml(complaint.id)}</p>` }),
      ];
      if (process.env.ADMIN_EMAIL) notifications.push(sendEmail({ to: process.env.ADMIN_EMAIL, replyTo: complaint.email, subject: `New complaint: ${complaint.subject}`, html: `<h2>Customer complaint</h2><p>${escapeHtml(complaint.name)} (${escapeHtml(complaint.email)})</p><p>${escapeHtml(complaint.category)} — ${escapeHtml(complaint.subject)}</p><p>Order: ${escapeHtml(complaint.orderId || 'Not supplied')}</p><p>${escapeHtml(complaint.message).replace(/\n/g, '<br/>')}</p><p>Reference: ${escapeHtml(complaint.id)}</p>` }));
      const results = await Promise.allSettled(notifications);
      emailSent = results[0].status === 'fulfilled';
      if (results.some((result) => result.status === 'rejected')) console.warn('[complaints] Complaint saved; an email notification could not be delivered.');
    }
    return NextResponse.json({ id: complaint.id, emailSent, message: 'Your complaint has been saved for our support team.' }, { status: 201 });
  } catch {
    return NextResponse.json({ message: 'We could not save your complaint. Please try again later.' }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
    const parsed = ComplaintListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return NextResponse.json({ message: 'Choose a valid complaint page or status.' }, { status: 400 });
    const { page, pageSize, status } = parsed.data;
    const userId = user.isAdmin ? undefined : user.id;
    const local = process.env.NODE_ENV === 'development' ? getLocalComplaints(userId) : [];
    function queryRecords(head = false) {
      let query = supabase.from('Complaint').select('*', { count: 'exact', head });
      if (userId) query = query.eq('userId', userId);
      return query;
    }
    if (local.length) {
      let remote: ComplaintRecord[];
      try {
        remote = await readAllRows<ComplaintRecord>((from, to) => queryRecords().order('createdAt', { ascending: false }).order('id', { ascending: false }).range(from, to));
      } catch { remote = []; }
      const seen = new Set(remote.map(complaint => complaint.id));
      return NextResponse.json(paginateComplaints([...remote, ...local.filter(complaint => !seen.has(complaint.id))], page, pageSize, status), { headers: { 'Cache-Control': 'no-store' } });
    }
    const offset = (page - 1) * pageSize;
    let total = 0;
    const pageRequest = readAllRows<ComplaintRecord>(async (from, to) => {
      let query = queryRecords().order('createdAt', { ascending: false }).order('id', { ascending: false });
      if (status !== 'all') query = query.eq('status', status);
      const result = await query.range(offset + from, offset + to);
      // PostgREST returns 416 when records disappear from the final page.
      // Return the current count so the client can move to the new last page.
      if (result.error?.code === 'PGRST103') {
        let countQuery = queryRecords(true);
        if (status !== 'all') countQuery = countQuery.eq('status', status);
        const current = await countQuery;
        if (current.error || typeof current.count !== 'number') throw current.error || new Error('Complaint count unavailable');
        total = current.count;
        if (offset + from >= total) return { data: [], error: null, count: Math.max(0, total - offset) };
      }
      if (typeof result.count !== 'number' && !result.error) throw new Error('Complaint count unavailable');
      total = result.count || 0;
      return { ...result, data: result.data as ComplaintRecord[] | null, count: Math.max(0, total - offset) };
    }, pageSize);
    const [complaints, ...counts] = await Promise.all([
      pageRequest,
      ...(['open', 'in_progress', 'resolved'] as const).map(value => queryRecords(true).eq('status', value)),
    ]);
    if (counts.some(result => result.error || typeof result.count !== 'number')) throw new Error('Complaint counts unavailable');
    return NextResponse.json({ complaints, total, page, pageSize, statusCounts: { open: counts[0].count, in_progress: counts[1].count, resolved: counts[2].count } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ message: 'Complaints are temporarily unavailable. Please try again later.' }, { status: 503 });
  }
}
