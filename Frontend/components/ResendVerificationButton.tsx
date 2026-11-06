'use client';

import { useState } from 'react';

export default function ResendVerificationButton({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function resend() {
    setLoading(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/users/resend-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Email could not be sent. Please try again later.');
      setMessage(data.message || 'Check your inbox for a verification link.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Email could not be sent. Please try again later.'); }
    finally { setLoading(false); }
  }
  return <div className="mt-2"><button type="button" disabled={loading || Boolean(message)} onClick={resend} className="text-sm text-rose-600 dark:text-rose-400 font-semibold disabled:opacity-50">{loading ? 'Sending…' : 'Resend verification email'}</button>{message && <p role="status" className="mt-2 text-xs text-green-700 dark:text-green-400">{message}</p>}{error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}</div>;
}
