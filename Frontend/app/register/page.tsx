'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import type { User } from '@/context/AuthContext';

function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch<User>('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      });
      login(data);
      router.push(`/${redirect}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-md">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Create your account</h1>
            <p className="text-gray-500 text-sm mt-1">
              Already have an account?{' '}
              <Link href={`/login${redirect !== '/' ? `?redirect=${redirect}` : ''}`} className="text-rose-600 hover:text-rose-700 font-medium">
                Sign in
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
              />
            </div>
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
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold rounded-2xl transition-all shadow-md hover:shadow-rose-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
