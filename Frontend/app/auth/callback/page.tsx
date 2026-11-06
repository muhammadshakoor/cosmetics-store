'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/context/AuthContext';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [failed, setFailed] = useState(false);
  const finishLogin = useEffectEvent((profile: User) => {
    login(profile, true);
    router.replace('/');
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session', { method: 'POST', credentials: 'same-origin' })
      .then(async (response) => {
        const profile = await response.json();
        if (!response.ok || !profile._id || !profile.token) throw new Error('Sign-in failed');
        if (!cancelled) finishLogin(profile as User);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50 dark:bg-gray-950 p-6">
      {failed ? (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-10 text-center max-w-sm w-full">
          <h1 className="text-gray-800 dark:text-gray-100 font-semibold text-lg mb-2">Sign-in failed</h1>
          <p className="text-gray-500 dark:text-gray-300 text-sm mb-6">Your sign-in may have expired. Please try again.</p>
          <Link href="/login" className="inline-block px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-2xl">Back to sign in</Link>
        </div>
      ) : (
        <div className="text-center" role="status">
          <div className="w-10 h-10 border-4 border-rose-300 border-t-rose-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">Signing you in…</p>
        </div>
      )}
    </div>
  );
}
