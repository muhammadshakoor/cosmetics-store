export interface BrowserUser {
  _id: string; name: string; email: string; isAdmin: boolean; token: string; picture?: string;
}

/** Used only for session expiry UX; the server verifies signatures and roles. */
export function getSessionExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const encoded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload: unknown = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    if (!payload || typeof payload !== 'object' || !('exp' in payload) || typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null;
    return payload.exp * 1000;
  } catch { return null; }
}

export function parseStoredUser(value: unknown, now = Date.now()): BrowserUser | null {
  if (!value || typeof value !== 'object') return null;
  const user = value as Partial<BrowserUser>;
  if (typeof user._id !== 'string' || !user._id || typeof user.name !== 'string' || typeof user.email !== 'string' || typeof user.isAdmin !== 'boolean' || typeof user.token !== 'string') return null;
  const expires = getSessionExpiry(user.token);
  if (!expires || expires <= now) return null;
  return { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, token: user.token, ...(typeof user.picture === 'string' ? { picture: user.picture } : {}) };
}

export function sanitizeWishlistIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 120))].slice(0, 200);
}

export function safeRedirectPath(value: string | null): string {
  const candidate = value?.trim() || '/';
  const path = candidate.startsWith('/') ? candidate : `/${candidate}`;
  if (path.startsWith('//') || /[\\\u0000-\u001f]/.test(path)) return '/';
  try {
    const url = new URL(path, 'https://lumina.invalid');
    return url.origin === 'https://lumina.invalid' ? `${url.pathname}${url.search}${url.hash}` : '/';
  } catch { return '/'; }
}
