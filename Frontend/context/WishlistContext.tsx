'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { sanitizeWishlistIds } from '@/lib/browserState';

interface WishlistContextType {
  wishlistIds: Set<string>;
  toggle: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  count: number;
  wishlistReady: boolean;
  wishlistError: string;
  reloadWishlist: () => void;
}
const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
const emptyIds = new Set<string>();
interface WishlistState { owner: string; ids: Set<string>; ready: boolean; error: string; }

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const owner = user?._id || 'guest';
  const token = user?.token;
  const [state, setState] = useState<WishlistState>({ owner: '', ids: new Set(), ready: false, error: '' });
  const [reload, setReload] = useState(0);
  const ids = useRef(new Set<string>());
  const pending = useRef(new Set<string>());
  const generation = useRef(0);

  useEffect(() => {
    if (!authReady) return;
    const attempt = ++generation.current;
    const controller = new AbortController();
    pending.current.clear();
    async function load() {
      let loaded: string[];
      try {
        if (!token) {
          try { loaded = sanitizeWishlistIds(JSON.parse(localStorage.getItem('wishlist') || '[]')); }
          catch { loaded = []; }
        } else {
          const response = await fetch('/api/wishlist', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' });
          if (!response.ok) throw new Error('Your wishlist could not be loaded. Please retry.');
          const data: unknown = await response.json();
          if (!Array.isArray(data)) throw new Error('Your wishlist could not be loaded. Please retry.');
          loaded = sanitizeWishlistIds(data.map((entry) => entry && typeof entry === 'object' && 'productId' in entry ? entry.productId : null));
        }
        if (attempt !== generation.current || controller.signal.aborted) return;
        ids.current = new Set(loaded);
        setState({ owner, ids: ids.current, ready: true, error: '' });
      } catch (error) {
        if (attempt !== generation.current || controller.signal.aborted) return;
        ids.current = new Set();
        setState({ owner, ids: ids.current, ready: true, error: error instanceof Error ? error.message : 'Your wishlist could not be loaded.' });
      }
    }
    void load();
    return () => { controller.abort(); };
  }, [authReady, owner, token, reload]);

  const ready = authReady && state.owner === owner && state.ready;
  const toggle = useCallback(async (productId: string) => {
    if (!ready || state.error) { toast.error(state.error || 'Your wishlist is still loading.'); return; }
    if (!sanitizeWishlistIds([productId]).length || pending.current.has(productId)) return;
    const attempt = generation.current;
    const previous = ids.current.has(productId);
    if (!previous && ids.current.size >= 200) { toast.error('Your wishlist can hold up to 200 products.'); return; }
    const desired = !previous;
    function apply(wishlisted: boolean) {
      const updated = new Set(ids.current);
      if (wishlisted) updated.add(productId); else updated.delete(productId);
      ids.current = updated;
      setState({ owner, ids: updated, ready: true, error: '' });
    }
    pending.current.add(productId);
    apply(desired);
    try {
      if (!token) localStorage.setItem('wishlist', JSON.stringify([...ids.current]));
      else {
        const response = await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ productId, wishlisted: desired }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Your wishlist could not be saved.');
        if (attempt === generation.current && typeof result.wishlisted === 'boolean') apply(result.wishlisted);
      }
    } catch (error) {
      if (attempt === generation.current) {
        apply(previous);
        toast.error(!token ? 'Browser storage is unavailable. Your wishlist change was not saved.' : error instanceof Error ? error.message : 'Your wishlist could not be saved.');
      }
    } finally { if (attempt === generation.current) pending.current.delete(productId); }
  }, [ready, state.error, owner, token]);
  const wishlistIds = state.owner === owner ? state.ids : emptyIds;
  const reloadWishlist = useCallback(() => setReload((value) => value + 1), []);
  return <WishlistContext.Provider value={{ wishlistIds, toggle, isWishlisted: (productId) => wishlistIds.has(productId), count: wishlistIds.size, wishlistReady: ready, wishlistError: state.owner === owner ? state.error : '', reloadWishlist }}>{children}</WishlistContext.Provider>;
}
export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}
