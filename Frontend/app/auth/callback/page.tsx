'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/context/AuthContext';

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error || !token) {
      setStatus('error');
      return;
    }

    fetch('/api/users/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((profile) => {
        if (!profile._id) throw new Error('Invalid profile');
        login({ ...profile, token } as User, true);
        router.replace('/');
      })
      .catch(() => setStatus('error'));
  }, [searchParams, login, router]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-sm w-full">
          <p className="text-gray-800 font-semibold text-lg mb-2">Sign-in failed</p>
          <p className="text-gray-500 text-sm mb-6">
            Something went wrong with Google sign-in. Please try again.
          </p>
          <a
            href="/login"
            className="inline-block px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-2xl text-sm transition-colors"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-rose-300 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-sm font-medium">Signing you in...</p>
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
