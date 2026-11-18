'use client';

import { useEffect, useEffectEvent, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/context/AuthContext';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import ResendVerificationButton from '@/components/ResendVerificationButton';
import { verifyEmailToken, type VerificationResult } from '@/lib/accountUi';

function VerifyEmailContent() {
  const token = useSearchParams().get('token') || '';
  const router = useRouter();
  const { login } = useAuth();
  const [saved, setSaved] = useState<{ token: string; result: VerificationResult } | null>(null);
  const [retry, setRetry] = useState(0);
  const requests = useRef(new Map<string, Promise<VerificationResult>>());
  const result = saved?.token === token ? saved.result : null;
  const status = !token ? 'no-token' : result?.status || 'loading';
  const finishSignIn = useEffectEvent((profile: User) => login(profile));

  useEffect(() => {
    if (!token) return;
    for (const key of requests.current.keys()) if (key !== token) requests.current.delete(key);
    let cancelled = false;
    let redirect: ReturnType<typeof setTimeout> | undefined;
    let request = requests.current.get(token);
    if (!request) {
      request = verifyEmailToken(token);
      requests.current.set(token, request);
    }
    request.then(next => {
      if (cancelled) return;
      if (next.status === 'error' && next.retryable) requests.current.delete(token);
      setSaved({ token, result: next });
      if (next.status === 'success') {
        finishSignIn(next.user);
        redirect = setTimeout(() => router.replace('/'), 3000);
      }
    }).catch(() => {
      requests.current.delete(token);
      if (!cancelled) setSaved({ token, result: { status: 'error', message: 'Verification is temporarily unavailable. Please try again.', retryable: true } });
    });
    return () => { cancelled = true; if (redirect) clearTimeout(redirect); };
  }, [token, router, retry]);

  const titles = { loading: 'Verifying your email?', success: 'Email verified!', already: 'Already verified', expired: 'Link expired', error: 'Verification failed', 'no-token': 'Verification link missing' };
  return (
    <div className="min-h-screen bg-linear-to-br from-rose-50 via-pink-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-16">
      <section className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100 dark:border-gray-700 text-center" aria-labelledby="verification-title">
        <div className="w-12 h-12 rounded-2xl bg-[#C2185B] flex items-center justify-center mx-auto mb-6 shadow-md" aria-hidden="true"><span className="text-white font-bold text-xl">L</span></div>
        {status === 'loading' ? <Loader2 size={48} aria-hidden="true" className="text-brand mx-auto mb-4 animate-spin" /> : status === 'success' || status === 'already' ? <CheckCircle size={56} aria-hidden="true" className="text-green-700 dark:text-green-300 mx-auto mb-4" /> : <XCircle size={56} aria-hidden="true" className="text-rose-700 dark:text-rose-300 mx-auto mb-4" />}
        <h1 id="verification-title" className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-3">{titles[status]}</h1>
        {status === 'loading' ? <p role="status" className="text-gray-600 dark:text-gray-300 text-sm">Please wait while we confirm your email address.</p> : status === 'success' ? <><p role="status" className="text-gray-600 dark:text-gray-300 mb-6">Your email is verified and you are signed in. We will take you to the store shortly.</p><Link href="/" className="button-primary">Go to Home</Link></> : status === 'expired' ? <><p className="text-gray-600 dark:text-gray-300 mb-4">{result?.message}</p>{result && 'email' in result && result.email ? <ResendVerificationButton email={result.email} /> : <Link href="/login" className="button-primary">Request another verification email</Link>}</> : <>
          <p role={status === 'error' ? 'alert' : undefined} className="text-gray-600 dark:text-gray-300 mb-6">{status === 'no-token' ? 'Open the full verification link from your email, or sign in to request a new one.' : result?.message}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {result?.status === 'error' && result.retryable && <button type="button" className="button-primary" onClick={() => { setSaved(null); setRetry(value => value + 1); }}>Retry verification</button>}
            <Link href="/login" className={result?.status === 'error' && result.retryable ? 'button-secondary' : 'button-primary'}>Sign In</Link>
          </div>
        </>}
      </section>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<p role="status" className="p-8 text-center">Loading verification?</p>}><VerifyEmailContent /></Suspense>;
}
