'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MessageSquareWarning, ArrowRight, Clock, Loader2, CheckCircle2, Plus } from 'lucide-react';
import Link from 'next/link';

interface Complaint {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  orderId: string | null;
  createdAt: string;
}

const STATUS_CONFIG = {
  open:        { label: 'Open',        color: 'bg-red-100 text-red-700',     icon: <Clock size={12} /> },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700',  icon: <Loader2 size={12} /> },
  resolved:    { label: 'Resolved',    color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 size={12} /> },
};

export default function MyComplaintsPage() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch('/api/complaints', {
      headers: { Authorization: `Bearer ${user.token}` },
    })
      .then((r) => r.json())
      .then(setComplaints)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center px-4">
        <div className="text-center">
          <MessageSquareWarning size={48} className="text-gray-200 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">Sign in to view your complaints</h2>
          <Link
            href="/login?redirect=complaints/my"
            className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-2xl transition-colors text-sm"
          >
            Sign In <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <MessageSquareWarning size={24} className="text-rose-500" />
            <h1 className="text-3xl font-extrabold text-[#1A0A0E]">My Complaints</h1>
          </div>
          <Link
            href="/complaints"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold rounded-2xl transition-colors shadow-sm"
          >
            <Plus size={15} /> New Complaint
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : complaints.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 py-20 text-center">
            <MessageSquareWarning size={48} className="text-gray-200 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-gray-700 mb-2">No complaints yet</h2>
            <p className="text-gray-400 text-sm mb-6">If you ever face an issue, we&apos;re here to help.</p>
            <Link
              href="/complaints"
              className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-2xl transition-colors text-sm"
            >
              Submit a Complaint <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => {
              const cfg = STATUS_CONFIG[c.status];
              const isOpen = expanded === c.id;
              return (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors"
                    onClick={() => setExpanded(isOpen ? null : c.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">{c.category}</span>
                        {c.orderId && <span className="text-xs text-gray-400">Order #{c.orderId}</span>}
                      </div>
                      <p className="font-semibold text-gray-800 text-sm truncate">{c.subject}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Submitted {new Date(c.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="text-gray-300 text-sm mt-1">{isOpen ? '▲' : '▼'}</span>
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 px-5 py-4">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{c.message}</p>
                      {c.status === 'resolved' && (
                        <div className="mt-4 flex items-center gap-2 text-green-600 text-sm font-medium">
                          <CheckCircle2 size={16} /> This complaint has been resolved.
                        </div>
                      )}
                      {c.status === 'in_progress' && (
                        <div className="mt-4 flex items-center gap-2 text-amber-600 text-sm font-medium">
                          <Loader2 size={16} /> Our team is working on this. We&apos;ll get back to you soon.
                        </div>
                      )}
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
