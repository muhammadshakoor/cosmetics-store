'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, ChevronUp, Clock, Loader2, MessageSquareWarning, Plus } from 'lucide-react';
import { complaintLabels, loadComplaintPage, type ComplaintFilter, type ComplaintPage, type ComplaintStatus } from '@/lib/complaintInbox';
import type { BrowserUser } from '@/lib/browserState';

const statusStyles: Record<ComplaintStatus, string> = {
  open: 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  in_progress: 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  resolved: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
};

/** The identity key discards every previous account's list, filters, and pending work. */
export default function ComplaintInbox({ user, admin = false }: { user: BrowserUser; admin?: boolean }) {
  return <InboxContent key={JSON.stringify([user._id, user.token, user.isAdmin, admin])} user={user} admin={admin} />;
}

function InboxContent({ user, admin }: { user: BrowserUser; admin: boolean }) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<ComplaintFilter>('all');
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ key: string; data: ComplaintPage | null; error: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [updateError, setUpdateError] = useState('');
  const mutationController = useRef<AbortController | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const shouldFocusResults = useRef(false);
  const requestKey = JSON.stringify([page, filter, refresh]);
  const loading = result?.key !== requestKey;
  const data = !loading ? result?.data : null;
  const error = !loading ? result?.error : '';

  useEffect(() => {
    const controller = new AbortController();
    loadComplaintPage(user.token, page, filter, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        if (page > 1 && data.complaints.length === 0) {
          setPage(Math.max(1, Math.ceil(data.total / data.pageSize)));
          return;
        }
        setResult({ key: requestKey, data, error: '' });
      })
      .catch(cause => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data: null, error: cause instanceof Error ? cause.message : 'Your complaints could not be loaded. Please try again.' });
      });
    return () => controller.abort();
  }, [user.token, page, filter, requestKey]);

  useEffect(() => () => mutationController.current?.abort(), []);
  useEffect(() => {
    if (result?.key !== requestKey || !shouldFocusResults.current) return;
    if (result.error) errorRef.current?.focus();
    else headingRef.current?.focus();
    shouldFocusResults.current = false;
  }, [result, requestKey]);

  async function updateStatus(id: string, status: ComplaintStatus) {
    if (mutationController.current || !admin) return;
    const controller = new AbortController();
    mutationController.current = controller;
    setUpdating(id); setUpdateError(''); setNotice('');
    try {
      const response = await fetch(`/api/complaints/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ status }), signal: controller.signal,
      });
      if (!response.ok) throw new Error('The status could not be saved. Please try again.');
      if (!controller.signal.aborted) { setNotice(`Complaint marked ${complaintLabels[status].toLowerCase()}.`); setRefresh(value => value + 1); }
    } catch (cause) {
      if (!controller.signal.aborted) setUpdateError(cause instanceof Error ? cause.message : 'The status could not be saved. Please try again.');
    } finally {
      if (!controller.signal.aborted) setUpdating(null);
      if (mutationController.current === controller) mutationController.current = null;
    }
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 ref={headingRef} tabIndex={-1} className="flex items-center gap-3 text-2xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-3xl"><MessageSquareWarning aria-hidden="true" className="text-brand shrink-0" size={26} />{admin ? 'Customer complaints' : 'My complaints'}</h1><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{admin ? 'Review customer requests and keep their status up to date.' : 'Follow the progress of your support requests.'}</p></div>
      {!admin && <Link href="/complaints" className="button-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"><Plus aria-hidden="true" size={16} />New complaint</Link>}
    </div>
    <div role="group" aria-label="Filter complaints by status" className="flex flex-wrap gap-2">
      {(Object.keys(complaintLabels) as ComplaintFilter[]).map(status => <button key={status} type="button" aria-pressed={filter === status}
        onClick={() => { if (status === filter && page === 1) return; shouldFocusResults.current = true; setFilter(status); setPage(1); setExpanded(null); }}
        className={`min-h-11 rounded-full border px-4 py-2 text-sm font-semibold ${filter === status ? 'border-transparent bg-rose-800 text-white dark:bg-rose-200 dark:text-rose-950' : 'border-gray-300 bg-white text-gray-700 hover:bg-rose-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'}`}>
        {complaintLabels[status]}{data ? ` (${status === 'all' ? Object.values(data.statusCounts).reduce((sum, count) => sum + count, 0) : data.statusCounts[status]})` : ''}
      </button>)}
    </div>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{notice}</p>}
    {updateError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">{updateError}</p>}
    {loading ? <div role="status" className="flex min-h-40 items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"><Loader2 aria-hidden="true" size={20} className="animate-spin" />Loading complaints…</div>
    : error ? <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-2xl border border-red-200 bg-white p-6 dark:border-red-900 dark:bg-gray-800"><h2 className="font-semibold text-gray-900 dark:text-gray-100">Complaints could not be loaded</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{error}</p><button type="button" className="button-secondary mt-4 rounded-xl px-4 py-2 text-sm font-semibold" onClick={() => { shouldFocusResults.current = true; setRefresh(value => value + 1); }}>Try again</button></div>
    : data?.complaints.length ? <>
      <div className="space-y-3">{data.complaints.map(complaint => {
        const isOpen = expanded === complaint.id;
        const triggerId = `complaint-heading-${complaint.id}`;
        const panelId = `complaint-details-${complaint.id}`;
        const StatusIcon = complaint.status === 'resolved' ? CheckCircle2 : complaint.status === 'in_progress' ? Loader2 : Clock;
        return <article key={complaint.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2><button id={triggerId} type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setExpanded(isOpen ? null : complaint.id)} className="flex min-h-16 w-full items-start gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 sm:p-5">
            <span className="min-w-0 flex-1"><span className="mb-2 flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[complaint.status]}`}><StatusIcon aria-hidden="true" size={13} />{complaintLabels[complaint.status]}</span><span className="text-xs text-gray-600 dark:text-gray-300">{complaint.category}</span></span>
              <span className="block break-words font-semibold text-gray-900 dark:text-gray-100">{complaint.subject}</span>
              <span className="mt-1 block text-xs text-gray-600 dark:text-gray-300">Submitted {new Date(complaint.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </span>{isOpen ? <ChevronUp aria-hidden="true" size={20} className="mt-1 shrink-0 text-gray-500 dark:text-gray-300" /> : <ChevronDown aria-hidden="true" size={20} className="mt-1 shrink-0 text-gray-500 dark:text-gray-300" />}
          </button></h2>
          {isOpen && <div id={panelId} role="region" aria-labelledby={triggerId} className="border-t border-gray-200 p-4 dark:border-gray-700 sm:p-5">
            {admin && <p className="mb-3 break-words text-sm text-gray-600 dark:text-gray-300">{complaint.name} · {complaint.email}</p>}
            {complaint.orderId && <p className="mb-3 break-all text-xs text-gray-600 dark:text-gray-300">Order reference: {complaint.orderId}</p>}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 [overflow-wrap:anywhere] dark:text-gray-200">{complaint.message}</p>
            {admin ? <div role="group" aria-label={`Change status for ${complaint.subject}`} className="mt-5 flex flex-wrap gap-2">{(['open', 'in_progress', 'resolved'] as ComplaintStatus[]).map(status => <button key={status} type="button" disabled={complaint.status === status || Boolean(updating)} aria-pressed={complaint.status === status} onClick={() => updateStatus(complaint.id, status)} className="button-secondary rounded-xl px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">{updating === complaint.id ? 'Saving…' : complaintLabels[status]}</button>)}</div>
            : <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-200">{complaint.status === 'resolved' ? 'This complaint has been resolved.' : complaint.status === 'in_progress' ? 'Our team is reviewing your request.' : 'Your complaint has been saved and is awaiting review.'}</p>}
          </div>}
        </article>;
      })}</div>
      <nav aria-label="Complaint pages" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p role="status" className="text-sm text-gray-600 dark:text-gray-300">Showing {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} of {data.total}</p>
        <div className="flex gap-2"><button type="button" disabled={page === 1} onClick={() => { shouldFocusResults.current = true; setPage(value => value - 1); setExpanded(null); }} className="button-secondary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">Previous</button><button type="button" disabled={page * data.pageSize >= data.total} onClick={() => { shouldFocusResults.current = true; setPage(value => value + 1); setExpanded(null); }} className="button-secondary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">Next</button></div>
      </nav>
    </> : <div className="rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center dark:border-gray-700 dark:bg-gray-800"><MessageSquareWarning aria-hidden="true" size={36} className="mx-auto mb-4 text-gray-500 dark:text-gray-400" /><h2 className="font-semibold text-gray-900 dark:text-gray-100">{filter === 'all' ? 'No complaints yet' : `No ${complaintLabels[filter].toLowerCase()} complaints`}</h2><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{filter === 'all' ? admin ? 'New customer requests will appear here.' : 'You can submit a complaint whenever you need help with an order.' : 'Try another status to see more requests.'}</p></div>}
  </div>;
}
