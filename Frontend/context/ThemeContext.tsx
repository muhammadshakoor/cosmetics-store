'use client';

import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { resolveTheme } from '@/lib/theme';
type Theme = 'light' | 'dark';
interface ThemeContextValue { theme: Theme; isDark: boolean; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', isDark: false, toggleTheme: () => {} });
let currentTheme: Theme = 'light';
let preference: Theme | null = null;
const listeners = new Set<() => void>();
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  if (currentTheme === theme) return;
  currentTheme = theme;
  listeners.forEach((listener) => listener());
}
function readPreference() {
  try { const saved = localStorage.getItem('lumina-theme'); return saved === 'light' || saved === 'dark' ? saved : null; }
  catch { return preference; }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  preference = readPreference();
  applyTheme(resolveTheme(preference, media.matches));
  const onSystemChange = () => { if (!preference) applyTheme(resolveTheme(null, media.matches)); };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== 'lumina-theme' && event.key !== null) return;
    preference = readPreference();
    applyTheme(resolveTheme(preference, media.matches));
  };
  media.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); media.removeEventListener('change', onSystemChange); window.removeEventListener('storage', onStorage); };
}
function toggleTheme() {
  preference = currentTheme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('lumina-theme', preference); } catch { /* Keep this tab's choice when storage is disabled. */ }
  applyTheme(preference);
}
const getSnapshot = () => currentTheme;
const getServerSnapshot = (): Theme => 'light';
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
