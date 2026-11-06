'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState('');
  const validLink = /^[a-f0-9]{64}$/.test(token);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    setStatus('loading');
    try {
      const response = await fetch('/api/users/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not reset your password.');
      window.history.replaceState(null, '', '/reset-password');
      setStatus('done');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not reset your password.');
      setStatus('idle');
    }
  }

  return (
    <div className="min-h-screen bg-rose-50 dark:bg-gray-950 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-700">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-3">{status === 'done' ? 'Password reset' : 'Choose a new password'}</h1>
        {status === 'done' ? (
          <><p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Your password has been updated and previous sessions have been signed out.</p><Link href="/login" className="text-rose-600 font-semibold">Sign in with your new password</Link></>
        ) : !validLink ? (
          <><p className="text-sm text-gray-600 dark:text-gray-300 mb-6">This reset link is invalid. Request a new email to continue.</p><Link href="/forgot-password" className="text-rose-600 font-semibold">Request a reset link</Link></>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <p className="text-sm text-gray-600 dark:text-gray-300">Use at least 6 characters. Your link expires after 30 minutes.</p>
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div><label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">New password</label><input id="new-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" /></div>
            <div><label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Confirm new password</label><input id="confirm-password" type="password" autoComplete="new-password" required minLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" /></div>
            <button disabled={status === 'loading'} type="submit" className="w-full rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 disabled:opacity-50">{status === 'loading' ? 'Updating password…' : 'Reset password'}</button>
            <Link href="/forgot-password" className="block text-center text-sm text-rose-600">Request another reset link</Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<p className="p-8 text-center">Loading…</p>}><ResetPasswordForm /></Suspense>;
}
