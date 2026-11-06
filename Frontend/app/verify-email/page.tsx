'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/context/AuthContext';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Mail, RefreshCw } from 'lucide-react';

type Status = 'loading' | 'success' | 'already' | 'expired' | 'error' | 'no-token';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');
  const [expiredEmail, setExpiredEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const token = searchParams.get('token');
  const started = useRef(false);

  useEffect(() => {
    // Tokens are single-use, and `login` changes identity after signing in — only verify once
    if (started.current) return;
    started.current = true;
    if (!token) {
      setStatus('no-token');
      return;
    }
    fetch(`/api/users/verify?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.verified) {
          setStatus('success');
          // Auto-login the user after verification
          login(data as User);
          setTimeout(() => router.push('/'), 3000);
        } else if (data.alreadyVerified) {
          setStatus('already');
        } else if (data.expired) {
          setStatus('expired');
          setExpiredEmail(data.email || '');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.message || 'Invalid verification link');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Something went wrong. Please try again.');
      });
  }, [token, login, router]);

  const handleResend = async () => {
    if (!expiredEmail) return;
    setResending(true);
    try {
      const res = await fetch('/api/users/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: expiredEmail }),
      });
      const data = await res.json();
      setResent(true);
      setMessage(data.message);
    } catch {
      setMessage('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100 text-center">

          {/* Logo */}
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center mx-auto mb-6 shadow-md">
            <span className="text-white font-bold text-xl">L</span>
          </div>

          {/* Loading */}
          {status === 'loading' && (
            <>
              <Loader2 size={48} className="text-rose-400 mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-bold text-gray-800 mb-2">Verifying your email...</h1>
              <p className="text-gray-400 text-sm">Please wait a moment.</p>
            </>
          )}

          {/* Success */}
          {status === 'success' && (
            <>
              <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Email verified!</h1>
              <p className="text-gray-500 mb-6">
                Your email has been verified successfully. You are now logged in and will be redirected shortly.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-2xl transition-colors shadow-md"
              >
                Go to Home
              </Link>
            </>
          )}

          {/* Already verified */}
          {status === 'already' && (
            <>
              <CheckCircle size={56} className="text-blue-400 mx-auto mb-4" />
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Already verified</h1>
              <p className="text-gray-500 mb-6">Your email address is already verified. You can log in normally.</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-2xl transition-colors shadow-md"
              >
                Sign In
              </Link>
            </>
          )}

          {/* Expired */}
          {status === 'expired' && (
            <>
              <XCircle size={56} className="text-amber-400 mx-auto mb-4" />
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Link expired</h1>
              <p className="text-gray-500 mb-6">{message}</p>
              {!resent ? (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white font-semibold rounded-2xl transition-colors shadow-md"
                >
                  <RefreshCw size={16} className={resending ? 'animate-spin' : ''} />
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </button>
              ) : (
                <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-2xl text-sm">
                  <Mail size={16} className="inline mr-2" />
                  {message}
                </div>
              )}
            </>
          )}

          {/* No token or error */}
          {(status === 'error' || status === 'no-token') && (
            <>
              <XCircle size={56} className="text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
                {status === 'no-token' ? 'No token provided' : 'Verification failed'}
              </h1>
              <p className="text-gray-500 mb-6">
                {message || 'This verification link is invalid. Please register again or request a new link.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/register"
                  className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-2xl transition-colors text-sm"
                >
                  Create Account
                </Link>
                <Link
                  href="/login"
                  className="px-5 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold rounded-2xl transition-colors text-sm"
                >
                  Sign In
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
