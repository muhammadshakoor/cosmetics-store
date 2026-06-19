'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { Heart, ShoppingCart, Trash2, Star, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface Product {
  _id: string; name: string; image: string; brand: string; category: string;
  price: number; countInStock: number; rating: number; numReviews: number;
}
interface WishlistItem { id: string; productId: string; product: Product; }

export default function WishlistPage() {
  const { user } = useAuth();
  const { toggle } = useWishlist();
  const { addToCart } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch('/api/wishlist', { headers: { Authorization: `Bearer ${user.token}` } })
      .then((r) => r.json())
      .then((data: WishlistItem[]) => setItems(data.filter((w) => w.product)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <Heart size={48} className="text-gray-200 dark:text-gray-700 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Sign in to view your wishlist</h2>
          <p className="text-gray-400 dark:text-gray-500 mb-6">Your saved items will be kept across all your devices.</p>
          <Link href="/login?redirect=wishlist" className="inline-flex items-center gap-2 px-6 py-3 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl transition-colors">
            Sign In <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Heart size={24} className="fill-rose-500 text-rose-500" />
          <h1 className="text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100">My Wishlist</h1>
          {!loading && <span className="text-lg text-gray-400 dark:text-gray-500 font-medium">({items.length})</span>}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-3xl h-72 animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
            <Heart size={48} className="text-gray-200 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-400 dark:text-gray-500 mb-6">Save products you love by clicking the heart icon</p>
            <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl transition-colors">
              Explore Products <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map(({ id, product: p }) => (
              <div key={id} className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:border-rose-100 dark:hover:border-rose-900/40 hover:shadow-lg transition-all group">
                <Link href={`/products/${p._id}`} className="block relative">
                  <div className="aspect-square overflow-hidden bg-[#FFF8F5] dark:bg-gray-700">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  {p.countInStock === 0 && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full">Sold Out</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); toggle(p._id); setItems((prev) => prev.filter((w) => w.product._id !== p._id)); }}
                    className="absolute top-3 right-3 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform"
                  >
                    <Heart size={13} className="fill-[#C2185B] text-[#C2185B]" />
                  </button>
                </Link>

                <div className="p-4">
                  <p className="text-[10px] text-[#C2185B] font-bold uppercase tracking-widest mb-1">{p.brand}</p>
                  <Link href={`/products/${p._id}`}>
                    <h3 className="font-semibold text-[#1A0A0E] dark:text-gray-100 text-sm leading-snug mb-2 line-clamp-2 hover:text-[#C2185B] transition-colors">{p.name}</h3>
                  </Link>
                  <div className="flex items-center gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={10} className={s <= Math.round(p.rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-600 text-gray-200 dark:text-gray-600'} />
                    ))}
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">({p.numReviews})</span>
                  </div>
                  <p className="font-extrabold text-[#1A0A0E] dark:text-gray-100 mb-3">Rs. {Math.round(p.price).toLocaleString()}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { if (p.countInStock === 0) return; addToCart({ product: p._id, name: p.name, image: p.image, price: p.price, qty: 1, countInStock: p.countInStock }); toast.success('Added to cart!'); }}
                      disabled={p.countInStock === 0}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#C2185B] hover:bg-[#A31555] text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ShoppingCart size={12} />
                      {p.countInStock === 0 ? 'Sold Out' : 'Add to Cart'}
                    </button>
                    <button
                      onClick={() => { toggle(p._id); setItems((prev) => prev.filter((w) => w.product._id !== p._id)); }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
