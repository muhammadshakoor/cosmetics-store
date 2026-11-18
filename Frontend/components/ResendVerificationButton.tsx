'use client';

import { useState } from 'react';
import { requestVerificationEmail } from '@/lib/accountUi';

export default function ResendVerificationButton({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function resend() {
    setLoading(true); setError(''); setMessage('');
    try {
      setMessage(await requestVerificationEmail(email));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Email could not be sent. Please try again later.'); }
    finally { setLoading(false); }
  }
  return <div className="mt-2"><button type="button" disabled={loading} onClick={resend} className="text-brand min-h-11 py-2 text-sm font-semibold underline underline-offset-4 disabled:opacity-50">{loading ? 'Sending…' : message ? 'Send another verification email' : error ? 'Retry sending verification email' : 'Resend verification email'}</button>{message && <p role="status" className="mt-2 text-sm text-green-700 dark:text-green-300">{message}</p>}{error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}</div>;
}
