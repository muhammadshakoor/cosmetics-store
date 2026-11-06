'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/context/AuthContext';
import ResendVerificationButton from '@/components/ResendVerificationButton';
import { safeRedirectPath } from '@/lib/browserState';
import { Mail, Sparkles, ShieldCheck, Truck, Eye, EyeOff } from 'lucide-react';

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between bg-linear-to-br from-rose-600 via-pink-600 to-rose-800 px-12 py-14 relative overflow-hidden">
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-white/3" />

      <div className="relative z-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <span className="text-2xl font-bold text-white tracking-wide">Lumina</span>
        </Link>
      </div>

      <div className="relative z-10 my-auto">
        <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
          Glow Up with<br />
          <span className="text-rose-200">Confidence</span>
        </h2>
        <p className="text-white/70 text-base leading-relaxed mb-10 max-w-xs">
          Explore skincare, artisan soaps and everyday beauty favorites. Sign in to revisit your saved products and order history.
        </p>
        <div className="space-y-4">
          {[
            { icon: <Sparkles size={16} />, text: 'Keep your favorite products in one place' },
            { icon: <ShieldCheck size={16} />, text: 'Track your account and order history' },
            { icon: <Truck size={16} />, text: 'See delivery costs before placing an order' },
            { icon: <Mail size={16} />, text: 'Email verification and password recovery' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">{icon}</div>
              <span className="text-white/80 text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-4 border border-white/20">
        <p className="text-white font-semibold mb-2">Need a hand with an order?</p>
        <p className="text-white/80 text-sm leading-relaxed">Find order updates in your profile or send our support team a message about your purchase.</p>
        <Link href="/contact" className="inline-block mt-3 text-white text-sm underline">Contact support</Link>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, login } = useAuth();
  const redirect = safeRedirectPath(searchParams.get('redirect'));
  const oauthError = ({
    google_cancelled: 'Google sign-in was cancelled.',
    google_failed: 'Google sign-in failed. Please try again.',
    facebook_cancelled: 'Facebook sign-in was cancelled.',
    facebook_failed: 'Facebook sign-in failed. Please try again.',
    facebook_no_email: 'Your Facebook account has no email address. Please use another sign-in method.',
  } as Record<string, string>)[searchParams.get('error') || ''] || '';

  useEffect(() => {
    if (user) router.replace(redirect);
  }, [user, router, redirect]);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError('');
    setUnverifiedEmail('');
    setLoading(true);
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.emailNotVerified) { setUnverifiedEmail(data.email || email); return; }
        throw new Error(data.message || 'Login failed');
      }
      login(data as User, rememberMe);
      router.replace(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left — Form */}
      <div className="flex flex-col items-center justify-center px-6 py-12 bg-white dark:bg-gray-900">
        <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="text-xl font-bold text-rose-600">Lumina</span>
        </Link>

        <div className="w-full max-w-sm mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-1 text-center">Welcome back</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 text-center">
            Don&apos;t have an account?{' '}
            <Link href={`/register${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="text-rose-600 hover:text-rose-700 font-semibold">
              Sign up free
            </Link>
          </p>

          {(error || oauthError) && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-sm mb-5">
              {error || oauthError}
            </div>
          )}

          {unverifiedEmail && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-4 mb-5">
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-amber-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-0.5">Email not verified</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Verify <strong>{unverifiedEmail}</strong> to sign in. You can request a new link below.
                  </p>
                  <ResendVerificationButton email={unverifiedEmail} />
                </div>
              </div>
            </div>
          )}

          {/* Social */}
          <div className="space-y-3 mb-6">
            <a href="/api/auth/google" className="flex items-center justify-center gap-3 w-full py-2.5 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </a>
            <a href="/api/auth/facebook" className="flex items-center justify-center gap-3 w-full py-2.5 bg-[#1877F2] hover:bg-[#166FE5] rounded-2xl text-sm font-semibold text-white transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"/>
              </svg>
              Continue with Facebook
            </a>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded accent-rose-500 cursor-pointer" />
                <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-xs text-rose-600 hover:text-rose-700 font-medium">
                Forgot password?
              </Link>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold rounded-2xl transition-all shadow-md hover:shadow-rose-200 hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed mt-1"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>

      {/* Right — Brand */}
      <BrandPanel />
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
