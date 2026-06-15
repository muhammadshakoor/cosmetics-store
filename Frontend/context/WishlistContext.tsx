'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface WishlistContextType {
  wishlistIds: Set<string>;
  toggle: (productId: string) => Promise<void>;
  isWishlisted: (productId: string) => boolean;
  count: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  const loadWishlist = useCallback(async () => {
    if (!user) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('wishlist');
        setWishlistIds(new Set(stored ? JSON.parse(stored) : []));
      }
      return;
    }
    try {
      const res = await fetch('/api/wishlist', {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      if (res.ok) {
        const data: { productId: string }[] = await res.json();
        setWishlistIds(new Set(data.map((w) => w.productId)));
      }
    } catch { /* ignore */ }
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('wishlist', JSON.stringify([...newSet]));
      }
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
    <WishlistContext.Provider value={{ wishlistIds, toggle, isWishlisted, count: wishlistIds.size }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
};
