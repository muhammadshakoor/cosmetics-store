'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlistIds: Set<string>;
  toggle: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  count: number;
  /** true once the wishlist has been loaded (from the server or this browser) */
  loaded: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);
const STORAGE_KEY = 'wishlist';

function readLocal(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const ids = stored ? JSON.parse(stored) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const loadWishlist = useCallback(async () => {
    if (!user) {
      setWishlistIds(new Set(readLocal()));
      setLoaded(true);
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const res = await fetch('/api/wishlist', { headers });
      if (res.ok) {
        const data: { productId: string }[] = await res.json();
        const ids = new Set(data.map((w) => w.productId));

        // Items hearted while signed out are added to the account, then cleared locally
        const guestIds = readLocal().filter((id) => !ids.has(id));
        await Promise.all(guestIds.map((productId) =>
          fetch('/api/wishlist', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId }),
          }).then((r) => { if (r.ok) ids.add(productId); }).catch(() => {})
        ));
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }

        setWishlistIds(ids);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, [user]);

  useEffect(() => { loadWishlist(); }, [loadWishlist]);

  const toggle = async (productId: string) => {
    const newSet = new Set(wishlistIds);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setWishlistIds(newSet);

    if (!user) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...newSet])); } catch { /* ignore */ }
      return;
    }
    try {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
        body: JSON.stringify({ productId }),
      });
    } catch { /* ignore */ }
  };

  const isWishlisted = (productId: string) => wishlistIds.has(productId);

  return (
    <WishlistContext.Provider value={{ wishlistIds, toggle, isWishlisted, count: wishlistIds.size, loaded }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};
