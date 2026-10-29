'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { safeRedirectPath, rememberPostLoginRedirect } from '@/lib/site';
import { Mail, CheckCircle, Sparkles, ShieldCheck, Truck, Gift, Eye, EyeOff } from 'lucide-react';

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col justify-between bg-linear-to-br from-rose-600 via-pink-600 to-rose-800 px-12 py-14 relative overflow-hidden">
      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5" />
      <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
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
          Join the Lumina<br />
          <span className="text-rose-200">Beauty Family</span>
        </h2>
        <p className="text-white/70 text-base leading-relaxed mb-10 max-w-xs">
          Create your free account and unlock exclusive deals, early access to new arrivals, and a personalised shopping experience.
        </p>
        <div className="space-y-4">
          {[
            { icon: <Gift size={16} />,       text: '10% off your first order with LUMINA10' },
            { icon: <Sparkles size={16} />,   text: 'Take the Skin Quiz for a personalised routine' },
            { icon: <ShieldCheck size={16} />, text: 'Save addresses & track orders easily' },
            { icon: <Truck size={16} />,       text: 'Free delivery on orders above Rs. 2,000' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">{icon}</div>
              <span className="text-white/80 text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-4">
        {[
          { value: '100%', label: 'Organic' },
          { value: 'COD', label: 'Nationwide' },
          { value: 'Halal', label: '& Cruelty-free' },
        ].map(({ value, label }) => (
          <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl px-3 py-4 text-center border border-white/20">
            <p className="text-white font-extrabold text-xl">{value}</p>
            <p className="text-white/60 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const redirect = safeRedirectPath(searchParams.get('redirect'));

  useEffect(() => {
    if (user) router.push(redirect);
  }, [user, router, redirect]);

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      setSentTo(data.email || email);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (sentTo) {
    return (
      <div className="min-h-screen bg-linear-to-br from-rose-50 via-pink-50 to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100 dark:border-gray-700 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mx-auto mb-5">
              <Mail size={30} className="text-rose-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">Check your inbox!</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-1">We sent a verification link to</p>
            <p className="font-semibold text-gray-800 dark:text-gray-200 mb-5">{sentTo}</p>
            <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl px-4 py-3 mb-6 text-left space-y-2">
              {[
                'Open the email from Lumina',
                'Click the "Verify My Email" button',
                'You will be logged in automatically',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                  <CheckCircle size={14} className="text-rose-400 mt-0.5 shrink-0" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Didn&apos;t receive it? Check your spam folder.</p>
            <ResendButton email={sentTo} />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-5">
              Wrong email?{' '}
              <button onClick={() => setSentTo('')} className="text-rose-500 hover:text-rose-700 font-medium">Go back</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left — Brand */}
      <BrandPanel />

      {/* Right — Form */}
      <div className="flex flex-col items-center justify-center px-6 py-12 bg-white dark:bg-gray-900">
        <Link href="/" className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-8 h-8 rounded-xl bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="text-xl font-bold text-rose-600">Lumina</span>
        </Link>

        <div className="w-full max-w-sm mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-1 text-center">Create your account</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 text-center">
            Already have an account?{' '}
            <Link href={`/login${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="text-rose-600 hover:text-rose-700 font-semibold">
              Sign in
            </Link>
          </p>

          {error && (
            <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-sm mb-5">
              {error}
            </div>
          )}

          {/* Social */}
          <div className="space-y-3 mb-6">
            <a href="/api/auth/google" onClick={() => rememberPostLoginRedirect(redirect)} className="flex items-center justify-center gap-3 w-full py-2.5 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </a>
            <a href="/api/auth/facebook" onClick={() => rememberPostLoginRedirect(redirect)} className="flex items-center justify-center gap-3 w-full py-2.5 bg-[#1877F2] hover:bg-[#166FE5] rounded-2xl text-sm font-semibold text-white transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.887v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z"/>
              </svg>
              Continue with Facebook
            </a>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">or sign up with email</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-full-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
              <input id="register-full-name"
                type="text" required autoComplete="name" value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
              />
            </div>
            <div>
              <label htmlFor="register-email-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email address</label>
              <input id="register-email-address"
                type="email" required autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input id="register-password"
                  type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete="new-password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-3 pr-11 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="register-confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'} required autoComplete="new-password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-4 py-3 pr-11 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full py-3 bg-[#C2185B] hover:bg-[#A31555] disabled:bg-rose-300 text-white font-semibold rounded-2xl transition-all shadow-md hover:shadow-rose-200 dark:hover:shadow-none hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed mt-1"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ResendButton({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      await fetch('/api/users/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  if (done) return <p className="text-sm text-green-600 dark:text-green-400 font-medium">New verification email sent!</p>;

  return (
    <button onClick={handleResend} disabled={loading} className="text-sm text-rose-500 hover:text-rose-700 font-medium disabled:opacity-50">
      {loading ? 'Sending...' : 'Resend verification email'}
    </button>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
