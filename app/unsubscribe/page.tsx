'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function UnsubscribeForm() {
  const token = useSearchParams().get('token') || '';
  const validLink = /^[a-f0-9]{64}$/.test(token);
  const [result, setResult] = useState<{ token: string; status: 'idle' | 'loading' | 'success'; error: string }>({ token: '', status: 'idle', error: '' });
  const status = result.token === token ? result.status : 'idle';
  const error = result.token === token ? result.error : '';
  async function unsubscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validLink) return;
    setResult({ token, status: 'loading', error: '' });
    try {
      const response = await fetch('/api/subscriptions/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'We could not update your preference. Please retry.');
      setResult({ token, status: 'success', error: '' });
    } catch (reason) {
      setResult({ token, status: 'idle', error: reason instanceof Error ? reason.message : 'We could not update your preference. Please retry.' });
    }
  }
  return <div className="min-h-[65vh] bg-[#FFF8F5] dark:bg-gray-950 px-4 py-16 flex items-center justify-center"><section className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8 shadow-sm" aria-labelledby="preferences-title">
    <h1 id="preferences-title" className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Email preferences</h1>
    {status === 'success' ? <p role="status" className="text-gray-700 dark:text-gray-200">You have been unsubscribed from this notification.</p> : !validLink ? <div role="alert" className="text-gray-700 dark:text-gray-200"><p>This unsubscribe link is incomplete or invalid. Open the full link from your Lumina email to update your preferences.</p><Link href="/contact" className="text-brand inline-flex min-h-11 items-center mt-3 font-semibold underline underline-offset-4">Contact support for help</Link></div> : <form onSubmit={unsubscribe}><p className="mb-5 text-gray-700 dark:text-gray-200">Confirm below to stop receiving this type of email from Lumina.</p>{error && <p role="alert" className="text-red-700 dark:text-red-300 mb-4">{error}</p>}<button disabled={status === 'loading'} className="button-primary">{status === 'loading' ? 'Updating?' : error ? 'Retry unsubscribe' : 'Unsubscribe'}</button></form>}
    <Link href="/" className="text-brand inline-flex min-h-11 items-center mt-6 underline underline-offset-4">Return to store</Link>
  </section></div>;
}

export default function UnsubscribePage() { return <Suspense fallback={<p role="status" className="p-12">Loading preferences?</p>}><UnsubscribeForm /></Suspense>; }
