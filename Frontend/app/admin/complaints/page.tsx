'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { MessageSquareWarning, ArrowLeft, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface Complaint {
  id: string;
  name: string;
  email: string;
  orderId: string | null;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
}

const STATUS_CONFIG = {
  open:        { label: 'Open',        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',    icon: <Clock size={12} /> },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', icon: <Loader2 size={12} /> },
  resolved:    { label: 'Resolved',    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', icon: <CheckCircle2 size={12} /> },
};

export default function AdminComplaintsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    if (!user.isAdmin) { router.replace('/'); return; }

    fetch('/api/complaints', {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => r.json())
      .then(setComplaints)
      .catch(() => toast.error('Failed to load complaints'))
      .finally(() => setLoading(false));
  }, [user, router]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user!.token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setComplaints((prev) => prev.map((c) => c.id === id ? { ...c, status: status as Complaint['status'] } : c));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = filter === 'all' ? complaints : complaints.filter((c) => c.status === filter);

  const counts = {
    all: complaints.length,
    open: complaints.filter((c) => c.status === 'open').length,
    in_progress: complaints.filter((c) => c.status === 'in_progress').length,
    resolved: complaints.filter((c) => c.status === 'resolved').length,
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-rose-500 mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to Admin
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-2xl flex items-center justify-center">
            <MessageSquareWarning size={20} className="text-rose-500" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">Customer Complaints</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">{counts.open} open · {counts.in_progress} in progress · {counts.resolved} resolved</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'open', 'in_progress', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-rose-200 dark:hover:border-rose-800'
              }`}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`ml-1.5 text-xs font-bold ${filter === f ? 'text-white/80' : 'text-gray-400 dark:text-gray-500'}`}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white dark:bg-gray-800 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 py-20 text-center">
            <MessageSquareWarning size={40} className="text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500 font-medium">No complaints found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => {
              const cfg = STATUS_CONFIG[c.status];
              const isOpen = expanded === c.id;
              return (
                <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                  {/* Header row */}
                  <button
                    className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : c.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{c.category}</span>
                        {c.orderId && <span className="text-xs text-gray-400 dark:text-gray-500">Order #{c.orderId}</span>}
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm truncate">{c.subject}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {c.name} · {c.email} · {new Date(c.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="text-gray-300 dark:text-gray-600 text-sm mt-1">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-gray-100 dark:border-gray-700 px-5 py-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap mb-5">{c.message}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mr-1">Change status:</span>
                        {(['open', 'in_progress', 'resolved'] as const).map((s) => (
                          <button
                            key={s}
                            disabled={c.status === s || updating === c.id}
                            onClick={() => updateStatus(c.id, s)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                              c.status === s
                                ? `${STATUS_CONFIG[s].color} cursor-default`
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {updating === c.id && c.status !== s ? '...' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
