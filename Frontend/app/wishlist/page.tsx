'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import Link from 'next/link';
import { Heart, ArrowRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import type { Product } from '@/types/api';

export default function WishlistPage() {
  const { user, authReady } = useAuth();
  const { wishlistIds, wishlistReady, wishlistError, reloadWishlist } = useWishlist();
  const owner = user?._id || 'guest';
  const token = user?.token;
  const [catalog, setCatalog] = useState<{ owner: string; products: Product[]; error: string }>({ owner: '', products: [], error: '' });
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!authReady) return;
    const controller = new AbortController();
    const url = token ? '/api/wishlist' : '/api/products';
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Saved products could not be loaded. Please retry.');
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error('Saved products could not be loaded. Please retry.');
        const products = token ? data.map((entry) => entry.product).filter(Boolean) : data;
        if (!controller.signal.aborted) setCatalog({ owner, products, error: '' });
      })
      .catch((error) => { if (!controller.signal.aborted) setCatalog({ owner, products: [], error: error instanceof Error ? error.message : 'Saved products could not be loaded.' }); });
    return () => controller.abort();
  }, [authReady, owner, token, reload]);
  const loading = !authReady || !wishlistReady || catalog.owner !== owner;
  const error = wishlistError || (catalog.owner === owner ? catalog.error : '');
  const products = catalog.owner === owner ? catalog.products.filter((product) => wishlistIds.has(product._id)) : [];
  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6"><Heart size={24} className="fill-rose-500 text-rose-500" /><h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">My Wishlist</h1>{!loading && <span className="text-gray-500">({products.length})</span>}</div>
        {authReady && !user && <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">Your favorites are saved in this browser. <Link href="/login?redirect=wishlist" className="text-rose-600 font-semibold underline">Sign in</Link> to manage your account wishlist.</p>}
        {error ? <div role="alert" className="p-8 bg-white dark:bg-gray-800 rounded-2xl text-gray-700 dark:text-gray-200"><p>{error}</p><button onClick={() => { reloadWishlist(); setReload((value) => value + 1); }} className="mt-4 text-rose-600 font-semibold">Try again</button></div>
          : loading ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" role="status" aria-label="Loading saved products">{[1, 2, 3, 4].map((id) => <div key={id} className="h-72 bg-white dark:bg-gray-800 rounded-3xl animate-pulse" />)}</div>
            : products.length ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div>
              : <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl"><Heart size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" /><h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">Your wishlist is empty</h2><p className="text-gray-500 mb-6">Save products you love with the heart button.</p><Link href="/products" className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-2xl font-semibold">Explore products <ArrowRight size={16} /></Link></div>}
      </div>
    </div>
  );
}
