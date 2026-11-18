import { parseStoredUser, type BrowserUser } from './browserState';

export function isSameBrowserSession(startingToken: string | undefined, currentToken: string | undefined): boolean {
  return Boolean(startingToken && startingToken === currentToken);
}

export async function requestVerificationEmail(email: string, request: typeof fetch = fetch): Promise<string> {
  const response = await request('/api/users/resend-verification', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof data?.message === 'string' ? data.message : 'Email could not be sent. Please try again.');
  if (typeof data?.message !== 'string' || !data.message.trim()) throw new Error('The email request could not be confirmed. Please retry.');
  return data.message;
}

export type VerificationResult =
  | { status: 'success'; user: BrowserUser; message: string }
  | { status: 'already' | 'expired' | 'error'; message: string; email?: string; retryable?: boolean };

export async function verifyEmailToken(token: string, request: typeof fetch = fetch): Promise<VerificationResult> {
  const response = await request(`/api/users/verify?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
  const data = await response.json().catch(() => null);
  if (response.ok && data?.verified === true) {
    const user = parseStoredUser(data);
    if (!user) throw new Error('Your verified sign-in could not be confirmed. Please sign in again.');
    return { status: 'success', user, message: 'Your email has been verified.' };
  }
  if (response.ok && data?.alreadyVerified === true) return { status: 'already', message: 'Your email address is already verified. You can sign in normally.' };
  if (response.status === 400 && data?.expired === true) return { status: 'expired', message: typeof data.message === 'string' ? data.message : 'This verification link has expired.', email: typeof data.email === 'string' ? data.email : undefined };
  return { status: 'error', message: typeof data?.message === 'string' ? data.message : 'Your email could not be verified. Please try again.', retryable: response.status >= 500 || response.status === 429 };
}
