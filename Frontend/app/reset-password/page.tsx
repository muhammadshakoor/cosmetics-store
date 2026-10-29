'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react';

const inputCls = 'w-full px-4 py-3 pr-11 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setStatus('loading');
    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setExpired(Boolean(data.expired));
        throw new Error(data.message || 'Could not reset your password');
      }
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password');
      setStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-rose-50 via-pink-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100 dark:border-gray-700">
        {status === 'done' ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">Password updated</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">You can now sign in with your new password.</p>
            <Link href="/login" className="inline-flex items-center justify-center w-full py-3 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl transition-colors">
              Sign in
            </Link>
          </div>
        ) : !token ? (
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">Reset link missing</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Please open the link from your email, or request a new one.</p>
            <Link href="/forgot-password" className="text-sm font-semibold text-[#C2185B] dark:text-rose-400 hover:underline">Request a new link</Link>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-md">
                <KeyRound size={22} className="text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">Choose a new password</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Use at least 6 characters.</p>
            </div>

            {error && (
              <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-sm text-center mb-6">
                {error}
                {expired && <> <Link href="/forgot-password" className="font-semibold underline">Request a new link</Link></>}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">New password</label>
                <div className="relative">
                  <input
                    id="reset-password" type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete="new-password"
                    value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={inputCls}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="reset-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm new password</label>
                <input
                  id="reset-confirm" type={showPassword ? 'text' : 'password'} required autoComplete="new-password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className={inputCls}
                />
              </div>
              <button
                type="submit" disabled={status === 'loading'}
                className="w-full py-3 bg-[#C2185B] hover:bg-[#A31555] disabled:bg-rose-300 text-white font-semibold rounded-2xl transition-all shadow-md disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Saving...' : 'Update password'}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-rose-600 transition-colors">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
