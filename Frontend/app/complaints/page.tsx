'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { MessageSquareWarning, CheckCircle, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
  'Wrong / Missing Item',
  'Product Quality',
  'Delivery Problem',
  'Payment Issue',
  'Return / Exchange',
  'Coupon / Discount',
  'Account Issue',
  'Other',
];

export default function ComplaintsPage() {
  const { user, authReady } = useAuth();
  if (!authReady) return <div role="status" className="px-4 py-20 text-center">Loading your account…</div>;
  return <ComplaintsForm key={JSON.stringify([user?._id, user?.token, user?.isAdmin])} />;
}

function ComplaintsForm() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    orderId: '',
    category: '',
    subject: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmation, setConfirmation] = useState<{ id: string; emailSent: boolean } | null>(null);
  const [error, setError] = useState('');
  const submissionController = useRef<AbortController | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => submissionController.current?.abort(), []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (submitted) confirmationRef.current?.focus(); }, [submitted]);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (submissionController.current) return;
    const controller = new AbortController();
    submissionController.current = controller;
    setError('');
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      if (controller.signal.aborted) return;
      setConfirmation({ id: typeof data.id === 'string' ? data.id : '', emailSent: data.emailSent === true });
      setSubmitted(true);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      if (!controller.signal.aborted) setLoading(false);
      if (submissionController.current === controller) submissionController.current = null;
    }
  };

  const inputCls = 'form-input';

  if (user?.isAdmin) {
    return (
      <div className="min-h-screen bg-linear-to-br from-rose-50 via-pink-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-10 max-w-md w-full text-center border border-gray-100 dark:border-gray-700">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-5">
            <Lock size={24} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Admins can&apos;t submit complaints</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
            The complaint form is for customers only. As an admin, you review and resolve complaints from the admin panel.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="px-5 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
              Back to Store
            </Link>
            <Link href="/admin/complaints" className="px-5 py-2.5 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl transition-colors text-sm">
              View Complaints
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-linear-to-br from-rose-50 via-pink-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-10 max-w-md w-full text-center border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h1 ref={confirmationRef} tabIndex={-1} className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">Complaint submitted</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-2">
            Your complaint has been saved for our support team.
          </p>
          {confirmation?.id && <p className="my-3 break-all text-xs font-medium text-gray-700 dark:text-gray-200">Reference: {confirmation.id}</p>}
          <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">{confirmation?.emailSent ? <>A confirmation email was sent to <strong>{form.email}</strong>.</> : 'Keep this reference. Email confirmation is currently unavailable; your complaint is still saved.'}</p>
          {user && <Link href="/complaints/my" className="text-brand mb-5 inline-flex min-h-11 items-center font-semibold underline">View my complaints</Link>}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-5 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              Back to Home
            </Link>
            <button
              onClick={() => { setSubmitted(false); setConfirmation(null); setForm({ name: user?.name || '', email: user?.email || '', orderId: '', category: '', subject: '', message: '' }); }}
              className="px-5 py-2.5 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl transition-colors text-sm"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-rose-50 via-pink-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-rose-500 mb-8 transition-colors">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-rose-800 to-pink-800 px-6 py-8 sm:px-8">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquareWarning size={26} className="text-white/80" />
              <h1 className="text-2xl font-extrabold text-white">Submit a Complaint</h1>
            </div>
            <p className="text-white text-sm">
              Tell us what happened so our support team can review your request.
            </p>
          </div>

          <div className="p-8">
            {error && (
              <div ref={errorRef} tabIndex={-1} role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-2xl text-sm mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="complaints-full-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name *</label>
                  <input id="complaints-full-name"
                    required type="text" minLength={2} maxLength={100} autoComplete="name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Jane Doe"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label htmlFor="complaints-email-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address *</label>
                  <input id="complaints-email-address"
                    required type="email" maxLength={254} autoComplete="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="you@gmail.com"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="complaints-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Category *
                  </label>
                  <select id="complaints-category"
                    required
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    className={`${inputCls} text-gray-700 dark:text-gray-200`}
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="complaints-order-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Order ID <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input id="complaints-order-id"
                    type="text" maxLength={120}
                    value={form.orderId}
                    onChange={(e) => set('orderId', e.target.value)}
                    placeholder="e.g. 3F9A1B2C"
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="complaints-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subject *</label>
                <input id="complaints-subject"
                  required type="text" minLength={3} maxLength={160}
                  value={form.subject}
                  onChange={(e) => set('subject', e.target.value)}
                  placeholder="Brief description of your issue"
                  className={inputCls}
                />
              </div>

              <div>
                <label htmlFor="complaints-your-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your Message *</label>
                <textarea id="complaints-your-message"
                  required
                  rows={5}
                  minLength={10} maxLength={5000}
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  placeholder="Describe your issue in detail. The more information you provide, the faster we can help you."
                  className={`${inputCls} resize-none`}
                />
              </div>

              <button
                type="submit" disabled={loading}
              className="button-primary w-full text-sm"
              >
                {loading ? 'Submitting...' : 'Submit Complaint'}
              </button>

              <p className="text-center text-xs text-gray-600 dark:text-gray-300">
                Your request is saved before confirmation is shown. Email confirmation depends on availability.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
