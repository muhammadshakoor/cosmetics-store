'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function UnsubscribeForm() {
  const token = useSearchParams().get('token');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState('');
  return <div className="max-w-md mx-auto px-4 py-20"><h1 className="text-2xl font-bold mb-4">Email preferences</h1>{status === 'success' ? <p role="status">You have been unsubscribed from this notification.</p> : <form onSubmit={async (event) => { event.preventDefault(); setStatus('loading'); setError(''); try { const response = await fetch('/api/subscriptions/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }); const data = await response.json(); if (!response.ok) throw new Error(data.message); setStatus('success'); } catch (err) { setError(err instanceof Error ? err.message : 'Please try again.'); setStatus('idle'); } }}><p className="mb-5">Confirm below to stop receiving this type of email from Lumina.</p>{error && <p role="alert" className="text-red-600 mb-4">{error}</p>}<button disabled={!token || status === 'loading'} className="bg-rose-600 text-white px-5 py-3 rounded-xl disabled:opacity-50">{status === 'loading' ? 'Updating…' : 'Unsubscribe'}</button></form>}<Link href="/" className="block mt-6 text-rose-600 underline">Return to store</Link></div>;
}

export default function UnsubscribePage() { return <Suspense fallback={<p className="p-12">Loading preferences…</p>}><UnsubscribeForm /></Suspense>; }
