'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { User } from '@/context/AuthContext';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login } = useAuth();
  const redirect = searchParams.get('redirect') || '/';

  useEffect(() => {
    if (user) router.push(`/${redirect}`);
  }, [user, router, redirect]);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<User>('/users/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      login(data);
      router.push(`/${redirect}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-md">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 text-sm mt-1">
              Don&apos;t have an account?{' '}
              <Link href={`/register${redirect !== '/' ? `?redirect=${redirect}` : ''}`} className="text-rose-600 hover:text-rose-700 font-medium">
                Sign up
              </Link>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-sm text-center mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold rounded-2xl transition-all shadow-md hover:shadow-rose-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
