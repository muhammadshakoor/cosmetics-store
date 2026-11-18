'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { getSessionExpiry, parseStoredUser, type BrowserUser } from '@/lib/browserState';

export type User = BrowserUser;
interface AuthContextType {
  user: User | null;
  authReady: boolean;
  login: (userData: User, remember?: boolean) => void;
  logout: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

function removeStoredSession() {
  try { localStorage.removeItem('userInfo'); } catch { /* Storage may be disabled. */ }
  try { sessionStorage.removeItem('userInfo'); } catch { /* Storage may be disabled. */ }
}
function persistSession(user: User, remember: boolean) {
  const serialized = JSON.stringify(user);
  try { (remember ? sessionStorage : localStorage).removeItem('userInfo'); } catch { /* Storage may be disabled. */ }
  try {
    const target = remember ? localStorage : sessionStorage;
    // Avoid cross-tab restore loops when another tab verifies the same session.
    if (target.getItem('userInfo') !== serialized) target.setItem('userInfo', serialized);
  } catch { /* The current tab remains usable when persistence is unavailable. */ }
}
function setHints(user: User | null, remember = true) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  const expires = user ? Math.max(0, Math.floor(((getSessionExpiry(user.token) || Date.now()) - Date.now()) / 1000)) : 0;
  const lifetime = !user ? '; max-age=0' : remember ? `; max-age=${expires}` : '';
  document.cookie = `lumina_auth=${user ? '1' : ''}; path=/; SameSite=Lax${lifetime}${secure}`;
  document.cookie = user?.isAdmin ? `lumina_admin=1; path=/; SameSite=Lax${lifetime}${secure}` : `lumina_admin=; path=/; max-age=0; SameSite=Lax${secure}`;
}
function readStoredSession(): { user: User; remember: boolean } | null {
  for (const remember of [true, false]) {
    try {
      const storage = remember ? localStorage : sessionStorage;
      const raw = storage.getItem('userInfo');
      if (!raw) continue;
      const user = parseStoredUser(JSON.parse(raw));
      if (user) return { user, remember };
      storage.removeItem('userInfo');
    } catch { /* Try the other storage when an entry is corrupt or unavailable. */ }
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const generation = useRef(0);
  const remembered = useRef(true);
  const logout = useCallback(() => {
    generation.current++;
    setUser(null);
    setAuthReady(true);
    removeStoredSession();
    setHints(null);
  }, []);
  const login = useCallback((userData: User, remember = true) => {
    const valid = parseStoredUser(userData);
    if (!valid) { logout(); return; }
    generation.current++;
    remembered.current = remember;
    setUser(valid);
    setAuthReady(true);
    persistSession(valid, remember);
    setHints(valid, remember);
  }, [logout]);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const attempt = ++generation.current;
      const stored = readStoredSession();
      setHints(null);
      if (!stored) { if (!cancelled) logout(); return; }
      try {
        const response = await fetch('/api/users/profile', { headers: { Authorization: `Bearer ${stored.user.token}` }, cache: 'no-store' });
        if (cancelled || attempt !== generation.current) return;
        if (response.status === 401 || response.status === 403) { logout(); return; }
        if (response.ok) {
          const profile: unknown = await response.json();
          if (cancelled || attempt !== generation.current) return;
          const valid = parseStoredUser({ ...(profile as object), token: stored.user.token });
          if (valid) login(valid, stored.remember); else logout();
        }
      } catch { /* Keep stored credentials for a retry; no unverified admin hint is restored. */ }
      finally { if (!cancelled) setAuthReady(true); }
    }
    void restore();
    const onStorage = (event: StorageEvent) => { if (event.key === 'userInfo' || event.key === null) void restore(); };
    window.addEventListener('storage', onStorage);
    return () => { cancelled = true; window.removeEventListener('storage', onStorage); };
  }, [login, logout]);

  useEffect(() => {
    if (!user) return;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    function expire() {
      const remaining = (getSessionExpiry(user!.token) || 0) - Date.now();
      if (remaining <= 0) logout();
      else timer = setTimeout(expire, Math.min(remaining, 2147483647));
    }
    timer = setTimeout(expire, Math.max(0, Math.min((getSessionExpiry(user.token) || 0) - Date.now(), 2147483647)));
    async function revalidate() {
      const attempt = generation.current;
      try {
        const response = await fetch('/api/users/profile', { headers: { Authorization: `Bearer ${user!.token}` }, cache: 'no-store' });
        if (cancelled || attempt !== generation.current) return;
        if (response.status === 401 || response.status === 403) { logout(); return; }
        if (response.ok) {
          const profile = await response.json();
          if (cancelled || attempt !== generation.current) return;
          const valid = parseStoredUser({ ...profile, token: user!.token });
          if (!valid) logout();
          else if (valid.isAdmin !== user!.isAdmin || valid.name !== user!.name || valid.picture !== user!.picture) login(valid, remembered.current);
        }
      } catch { /* A transient network failure does not destroy the session. */ }
    }
    window.addEventListener('focus', revalidate);
    return () => { cancelled = true; clearTimeout(timer); window.removeEventListener('focus', revalidate); };
  }, [user, login, logout]);

  const value = useMemo(() => ({ user, authReady, login, logout }), [user, authReady, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
