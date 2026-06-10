'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('loading');
    try {
      const res = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Something went wrong');
      }
      setStatus('sent');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100">

          {status === 'sent' ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <Mail size={28} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                We&apos;ve sent a password reset link to <span className="font-semibold text-gray-700">{email}</span>.
                Check your inbox (and spam folder just in case).
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-[#C2185B] font-semibold hover:underline"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-md">
                  <span className="text-white font-bold text-xl">L</span>
                </div>
                <h1 className="text-2xl font-extrabold text-gray-900">Forgot Password?</h1>
                <p className="text-gray-500 text-sm mt-1">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm text-center mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold rounded-2xl transition-all shadow-md hover:shadow-rose-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed"
                >
                  {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <div className="text-center mt-6">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-rose-600 transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
