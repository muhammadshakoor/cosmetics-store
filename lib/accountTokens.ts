import { createHash, randomBytes } from 'node:crypto';

export function createAccountToken(): string {
  return randomBytes(32).toString('hex');
}

export function isValidAccountToken(token: unknown): token is string {
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);
}

export function hashAccountToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredUrl && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_SITE_URL must be configured for account links.');
  }
  const url = new URL(configuredUrl || 'http://localhost:3001');
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('NEXT_PUBLIC_SITE_URL must use HTTPS in production.');
  }
  return url.origin;
}
