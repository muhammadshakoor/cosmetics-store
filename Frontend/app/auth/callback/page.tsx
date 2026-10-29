'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/context/AuthContext';
import { safeRedirectPath, POST_LOGIN_REDIRECT_KEY } from '@/lib/site';

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const started = useRef(false);
  const token = searchParams.get('token');
  const invalidLink = Boolean(searchParams.get('error')) || !token;

  useEffect(() => {
    // `login` changes identity on every auth update — only exchange the token once
    if (started.current || invalidLink) return;
    started.current = true;

    fetch('/api/users/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((profile) => {
        if (!profile._id) throw new Error('Invalid profile');
        login({ ...profile, token } as User, true);
        let target = '/';
        try {
          target = safeRedirectPath(sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY));
          sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
        } catch { /* storage unavailable */ }
        router.replace(target);
      })
      .catch(() => setStatus('error'));
  }, [token, invalidLink, login, router]);

  if (invalidLink || status === 'error') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-rose-50 dark:bg-gray-950 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-10 text-center max-w-sm w-full">
          <p className="text-gray-800 dark:text-gray-100 font-semibold text-lg mb-2">Sign-in failed</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            We couldn&apos;t complete your sign-in. Please try again or use your email and password.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-2.5 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl text-sm transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-rose-50 dark:bg-gray-950" role="status">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-rose-300 border-t-[#C2185B] rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">Signing you in...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <AuthCallbackInner />
    </Suspense>
  );
}
