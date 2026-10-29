'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard, { type ProductType } from '@/components/ProductCard';
import { API_URL } from '@/lib/api';

export default function WishlistPage() {
  const { user } = useAuth();
  const { wishlistIds, loaded } = useWishlist();
  const [products, setProducts] = useState<Record<string, ProductType | null>>({});

  // Fetch any wishlisted product we haven't loaded yet (works for guests and signed-in customers)
  const ids = [...wishlistIds];
  const missing = ids.filter((id) => !(id in products));
  const missingKey = missing.join(',');
  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    Promise.all(missingKey.split(',').map(async (id) => {
      try {
        const res = await fetch(`${API_URL}/products/${id}`);
        return [id, res.ok ? await res.json() as ProductType : null] as const;
      } catch {
        return [id, null] as const;
      }
    })).then((entries) => {
      if (!cancelled) setProducts((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
    return () => { cancelled = true; };
  }, [missingKey]);

  const loading = !loaded || missing.length > 0;
  const items = ids.map((id) => products[id]).filter((p): p is ProductType => Boolean(p));

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 py-8 sm:py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Heart size={24} className="fill-[#C2185B] text-[#C2185B]" aria-hidden="true" />
          <h1 className="text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100">My Wishlist</h1>
          {!loading && <span className="text-lg text-gray-500 dark:text-gray-400 font-medium">({items.length})</span>}
        </div>

        {!user && (
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-white dark:bg-gray-800 px-4 py-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">Your wishlist is saved on this device. Sign in to keep it across all your devices.</p>
            <Link href="/login?redirect=wishlist" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C2185B] dark:text-rose-400 hover:underline shrink-0">
              Sign in <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {Array.from({ length: Math.max(ids.length, 4) }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl h-72 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 sm:py-24 px-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
            <Heart size={48} className="text-gray-200 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Tap the heart on any product to save it for later.</p>
            <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl transition-colors">
              Explore Products <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {items.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
