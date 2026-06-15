'use client';

import { useState } from 'react';
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
  const [error, setError] = useState('');

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center border border-gray-100">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <Lock size={24} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Admins can&apos;t submit complaints</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            The complaint form is for customers only. As an admin, you review and resolve complaints from the admin panel.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="px-5 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-2xl hover:bg-gray-50 transition-colors text-sm">
              Back to Store
            </Link>
            <Link href="/admin/complaints" className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-2xl transition-colors text-sm">
              View Complaints
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Complaint Submitted!</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            We&apos;ve received your complaint and sent a confirmation to <strong>{form.email}</strong>.
          </p>
          <p className="text-gray-400 text-sm mb-8">Our team will respond within 24–48 hours.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-5 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-2xl hover:bg-gray-50 transition-colors text-sm"
            >
              Back to Home
            </Link>
            <button
              onClick={() => { setSubmitted(false); setForm({ name: user?.name || '', email: user?.email || '', orderId: '', category: '', subject: '', message: '' }); }}
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-2xl transition-colors text-sm"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-500 mb-8 transition-colors">
          <ArrowLeft size={14} /> Back to Home
        </Link>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-8 py-8">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquareWarning size={26} className="text-white/80" />
              <h1 className="text-2xl font-extrabold text-white">Submit a Complaint</h1>
            </div>
            <p className="text-white/70 text-sm">
              We take every complaint seriously. Fill out the form below and we&apos;ll get back to you within 24–48 hours.
            </p>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name *</label>
                  <input
                    required type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address *</label>
                  <input
                    required type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category *
                  </label>
                  <select
                    required
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all bg-white text-gray-700"
                  >
                    <option value="">Select a category</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Order ID <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.orderId}
                    onChange={(e) => set('orderId', e.target.value)}
                    placeholder="e.g. 3F9A1B2C"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
                <input
                  required type="text"
                  value={form.subject}
                  onChange={(e) => set('subject', e.target.value)}
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your Message *</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  placeholder="Describe your issue in detail. The more information you provide, the faster we can help you."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all resize-none"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold rounded-2xl transition-all shadow-md hover:shadow-rose-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Submitting...' : 'Submit Complaint'}
              </button>

              <p className="text-center text-xs text-gray-400">
                You will receive a confirmation email after submission.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
