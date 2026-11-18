'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { sanitizeWishlistIds } from '@/lib/browserState';
import { mergeGuestWishlist, readGuestWishlist } from '@/lib/wishlist';

interface WishlistContextType {
  wishlistIds: Set<string>;
  toggle: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  count: number;
  wishlistReady: boolean;
  wishlistError: string;
  wishlistNotice: string;
  reloadWishlist: () => void;
}
const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
const emptyIds = new Set<string>();
interface WishlistState { key: string; ids: Set<string>; ready: boolean; error: string; notice: string; }

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, authReady } = useAuth();
  const owner = user?._id || 'guest';
  const token = user?.token;
  const [state, setState] = useState<WishlistState>({ key: '', ids: new Set(), ready: false, error: '', notice: '' });
  const [reload, setReload] = useState(0);
  const requestKey = JSON.stringify([owner, token, reload]);
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
      let notice = '';
      try {
        if (!token) {
          try { loaded = readGuestWishlist(localStorage); }
          catch { loaded = []; }
        } else {
          try {
            const merged = await mergeGuestWishlist(localStorage, token, controller.signal);
            if (merged.pendingIds.length) notice = 'Your account wishlist is full. Some favorites remain saved in this browser. Remove account items, then retry adding browser favorites.';
            else if (merged.unavailableIds.length) notice = 'Some browser favorites are no longer available. Your other favorites have been added to your account.';
          } catch {
            if (controller.signal.aborted) return;
            notice = 'Your browser favorites could not be added to your account yet. They remain saved in this browser. Retry to add them.';
          }
          const response = await fetch('/api/wishlist', { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal, cache: 'no-store' });
          if (!response.ok) throw new Error('Your wishlist could not be loaded. Please retry.');
          const data: unknown = await response.json();
          if (!Array.isArray(data)) throw new Error('Your wishlist could not be loaded. Please retry.');
          loaded = sanitizeWishlistIds(data.map((entry) => entry && typeof entry === 'object' && 'productId' in entry ? entry.productId : null));
        }
        if (attempt !== generation.current || controller.signal.aborted) return;
        ids.current = new Set(loaded);
        setState({ key: requestKey, ids: ids.current, ready: true, error: '', notice });
      } catch (error) {
        if (attempt !== generation.current || controller.signal.aborted) return;
        ids.current = new Set();
        setState({ key: requestKey, ids: ids.current, ready: true, error: error instanceof Error ? error.message : 'Your wishlist could not be loaded.', notice });
      }
    }
    void load();
    return () => { controller.abort(); };
  }, [authReady, owner, token, requestKey]);

  const ready = authReady && state.key === requestKey && state.ready;
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
      setState(current => ({ key: requestKey, ids: updated, ready: true, error: '', notice: current.key === requestKey ? current.notice : '' }));
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
  }, [ready, state.error, requestKey, token]);
  const wishlistIds = state.key === requestKey ? state.ids : emptyIds;
  const reloadWishlist = useCallback(() => setReload((value) => value + 1), []);
  return <WishlistContext.Provider value={{ wishlistIds, toggle, isWishlisted: (productId) => wishlistIds.has(productId), count: wishlistIds.size, wishlistReady: ready, wishlistError: state.key === requestKey ? state.error : '', wishlistNotice: state.key === requestKey ? state.notice : '', reloadWishlist }}>{children}</WishlistContext.Provider>;
}
export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}
