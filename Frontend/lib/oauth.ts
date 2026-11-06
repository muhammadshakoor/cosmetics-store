import { randomBytes, timingSafeEqual } from 'node:crypto';

export type OAuthProvider = 'google' | 'facebook';
export const OAUTH_SESSION_COOKIE = 'lumina_oauth_session';

export function createOAuthState(): string {
  return randomBytes(32).toString('hex');
}

export function isValidOAuthState(received: string | null, expected: string | undefined): boolean {
  if (!received || !expected || !/^[a-f0-9]{64}$/.test(received) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export function oauthStateCookie(provider: OAuthProvider): string {
  return `lumina_oauth_state_${provider}`;
}

export function oauthCookieOptions(path: string, maxAge: number) {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path, maxAge };
}
