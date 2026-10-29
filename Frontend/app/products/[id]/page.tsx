'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Star, ShoppingCart, ChevronRight, Heart, Shield, Truck, Banknote, Leaf, Minus, Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { API_URL } from '@/lib/api';
import type { ProductType } from '@/components/ProductCard';
import ProductCard from '@/components/ProductCard';
import toast from 'react-hot-toast';

const CATEGORY_LABELS: Record<string, string> = {
  skincare: 'Skincare', soaps: 'Handmade Soaps', bodycare: 'Body Care', haircare: 'Hair Care', fragrance: 'Fragrance', makeup: 'Makeup',
};

// Category-level guidance; product-specific details belong in the product description
const CATEGORY_DETAILS: Record<string, { ingredients: string; usage: string }> = {
  soaps: {
    ingredients: 'Cold-processed from plant oils and butters, with natural clays, botanicals and pure essential oils. The full ingredient list is printed on each bar\'s wrapper.',
    usage: 'Work into a rich lather between wet hands or on a loofah, massage gently over skin and rinse. Keep the bar on a draining soap dish between uses so it lasts longer.',
  },
  skincare: {
    ingredients: 'Made with pure botanical oils, herbal extracts and natural clays. The full ingredient list is printed on the pack.',
    usage: 'Apply to clean skin, morning and/or evening. Patch-test on your inner arm 24 hours before first use.',
  },
  bodycare: {
    ingredients: 'Blended from nourishing plant oils and butters with natural fragrance. The full ingredient list is printed on the pack.',
    usage: 'Massage into clean, slightly damp skin after bathing, focusing on dry areas such as elbows and knees.',
  },
  haircare: {
    ingredients: 'Formulated with herbal extracts and botanical oils. The full ingredient list is printed on the pack.',
    usage: 'Apply to scalp and lengths, massage gently, and rinse thoroughly. For oils, leave on for at least an hour (or overnight) before washing.',
  },
  fragrance: {
    ingredients: 'Natural essential oils and botanical extracts. The full ingredient list is printed on the pack.',
    usage: 'Apply to pulse points — wrists, neck and behind the ears. Avoid contact with eyes.',
  },
};
const DEFAULT_DETAILS = {
  ingredients: 'Made with natural, skin-loving ingredients. The full ingredient list is printed on the pack.',
  usage: 'Use as directed on the pack. Patch-test before first use.',
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const { isWishlisted, toggle } = useWishlist();

  const [product, setProduct] = useState<ProductType | null>(null);
  const [related, setRelated] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState('ingredients');
  const [restockEmail, setRestockEmail] = useState('');
  const [notifySubmitting, setNotifySubmitting] = useState(false);

  const handleRestockNotify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockEmail.trim()) return;
    setNotifySubmitting(true);
    try {
      const res = await fetch('/api/notify-restock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: restockEmail, productId: id, productName: product?.name }),
      });
      if (res.ok) {
        toast.success('🎉 Registered! We will email you when back in stock.');
        setRestockEmail('');
      } else {
        toast.error('Failed to register notification.');
      }
    } catch {
      toast.error('Failed to register notification.');
    } finally {
      setNotifySubmitting(false);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_URL}/products/${id}`);
        if (res.ok) {
          const p: ProductType = await res.json();
          setProduct(p);
          const relRes = await fetch(`${API_URL}/products?category=${p.category}&limit=4`);
          if (relRes.ok) {
            const all: ProductType[] = await relRes.json();
            setRelated(all.filter((r) => r._id !== id).slice(0, 4));
          }
        }
      } catch {
        // failed
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({ product: product._id, name: product.name, image: product.image, price: product.price, qty, countInStock: product.countInStock });
    setAdded(true);
    toast.success(`${product.name} added to cart!`);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-gray-200 dark:bg-gray-800 rounded-3xl h-96 animate-pulse" />
          <div className="space-y-4">
            {['w-1/4', 'w-3/4', 'w-1/3', 'w-full', 'w-2/3'].map((w, i) => (
              <div key={i} className={`bg-gray-200 dark:bg-gray-800 rounded-xl h-6 animate-pulse ${w}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Product not found</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">It may have been removed or the link is incorrect.</p>
          <Link href="/products" className="inline-block mt-6 px-6 py-3 bg-[#C2185B] text-white font-semibold rounded-2xl hover:bg-[#A31555] transition-colors">
            Browse all products
          </Link>
        </div>
      </div>
    );
  }

  const categoryKey = product.category?.toLowerCase() || '';
  const categoryLabel = CATEGORY_LABELS[categoryKey] || product.category;
  const details = CATEGORY_DETAILS[categoryKey] || DEFAULT_DETAILS;
  const wishlisted = isWishlisted(product._id);

  return (
    // Extra bottom padding on mobile so the sticky purchase bar never covers content
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-950 pt-6 sm:pt-10 px-4 ${product.countInStock > 0 ? 'pb-28 sm:pb-12' : 'pb-12'}`}>
      <div className="max-w-6xl mx-auto">
        <nav aria-label="Breadcrumb" className="mb-6 sm:mb-8">
          <ol className="flex items-center flex-wrap gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <li><Link href="/" className="hover:text-[#C2185B] dark:hover:text-rose-400 transition-colors">Home</Link></li>
            <li aria-hidden="true"><ChevronRight size={14} /></li>
            <li><Link href="/products" className="hover:text-[#C2185B] dark:hover:text-rose-400 transition-colors">Shop</Link></li>
            {categoryLabel && (
              <>
                <li aria-hidden="true"><ChevronRight size={14} /></li>
                <li><Link href={`/products?category=${categoryKey}`} className="hover:text-[#C2185B] dark:hover:text-rose-400 transition-colors">{categoryLabel}</Link></li>
              </>
            )}
            <li aria-hidden="true"><ChevronRight size={14} /></li>
            <li aria-current="page" className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-[45vw] sm:max-w-xs">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="relative">
            <div className="rounded-3xl overflow-hidden bg-linear-to-br from-rose-50 to-pink-50 dark:from-gray-800 dark:to-gray-800 aspect-square shadow-lg">
              <img
                src={product.image || `https://picsum.photos/seed/${product._id}/600/600`}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={() => toggle(product._id)}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={wishlisted}
              className="absolute top-4 right-4 p-3 bg-white dark:bg-gray-800 rounded-full shadow-md hover:scale-110 transition-transform"
            >
              <Heart
                size={18}
                className={wishlisted ? 'fill-[#C2185B] text-[#C2185B]' : 'text-gray-500 dark:text-gray-400'}
              />
            </button>
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            <p className="text-sm text-rose-500 font-semibold uppercase tracking-widest mb-2">{product.brand}</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight mb-4">
              {product.name}
            </h1>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} className={s <= Math.round(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700'} />
                ))}
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{product.rating.toFixed(1)} ({product.numReviews} reviews)</span>
            </div>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-4xl font-black text-gray-900 dark:text-gray-100">Rs. {Math.round(product.price).toLocaleString()}</span>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                product.countInStock > 5 ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                product.countInStock > 0 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold' :
                'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'
              }`}>
                {product.countInStock > 5 ? 'In Stock' : product.countInStock > 0 ? `${product.countInStock} Left!` : 'Out of Stock'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { icon: <Leaf size={13} aria-hidden="true" />, text: 'Organic & handmade' },
                { icon: <Banknote size={13} aria-hidden="true" />, text: 'Cash on Delivery' },
                { icon: <Truck size={13} aria-hidden="true" />, text: 'Free delivery over Rs. 2,000' },
              ].map(({ icon, text }) => (
                <span key={text} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-full px-3 py-1.5">
                  <span className="text-[#C2185B] dark:text-rose-400">{icon}</span>{text}
                </span>
              ))}
            </div>

            {product.countInStock > 0 && product.countInStock <= 5 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-bold mb-4 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true" />
                Only {product.countInStock} left in stock — order soon!
              </p>
            )}

            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6 text-sm">{product.description || 'A premium cosmetic product crafted for your beauty routine.'}</p>

            {product.countInStock > 0 ? (
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-2xl overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
                  <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="Decrease quantity" className="px-4 py-3.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Minus size={16} /></button>
                  <span className="px-5 py-3 font-semibold text-gray-900 dark:text-gray-100 border-x border-gray-200 dark:border-gray-600 min-w-12 text-center" aria-live="polite" aria-label={`Quantity ${qty}`}>{qty}</span>
                  <button type="button" onClick={() => setQty(Math.min(product.countInStock, qty + 1))} disabled={qty >= product.countInStock} aria-label="Increase quantity" className="px-4 py-3.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={16} /></button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                    added ? 'bg-green-600 text-white' : 'bg-[#C2185B] hover:bg-[#A31555] text-white shadow-lg hover:shadow-rose-200 dark:hover:shadow-none hover:-translate-y-0.5'
                  }`}
                >
                  <ShoppingCart size={16} />
                  {added ? 'Added to Cart!' : 'Add to Cart'}
                </button>
              </div>
            ) : (
              /* Restock Notification Form */
              <div className="bg-amber-50/70 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-6">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">🔔 Currently Out of Stock</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Enter your email to receive an instant alert when back in stock.</p>
                <form onSubmit={handleRestockNotify} className="flex gap-2">
                  <input
                    type="email"
                    required
                    aria-label="Email for restock alert"
                    placeholder="Enter your email"
                    value={restockEmail}
                    onChange={(e) => setRestockEmail(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  <button
                    type="submit"
                    disabled={notifySubmitting}
                    className="px-4 py-2 bg-[#1A0A0E] text-white font-bold rounded-xl text-xs hover:bg-black transition-colors disabled:opacity-50"
                  >
                    {notifySubmitting ? 'Submitting...' : 'Notify Me'}
                  </button>
                </form>
              </div>
            )}

            {/* Expandable Tabs Accordion */}
            <div className="space-y-2 border-t border-gray-100 dark:border-gray-700 pt-6">
              {[
                { id: 'ingredients', label: '🌿 Ingredients', content: details.ingredients },
                { id: 'usage', label: '📖 How to Use', content: details.usage },
                { id: 'safety', label: '✅ Our Promise', content: '100% Cruelty-Free · Halal Ingredients · Paraben & Sulfate Free · Handmade in small batches. For external use only — discontinue use if irritation occurs.' },
                { id: 'delivery', label: '🚚 Delivery & Returns', content: 'Delivered across Pakistan in 2–5 business days (1–3 days in Lahore, Karachi & Islamabad). Free delivery on orders over Rs. 2,000, otherwise Rs. 200. Pay with Cash on Delivery, JazzCash or EasyPaisa. Damaged or incorrect items can be returned within 7 days of delivery.' },
              ].map((tab) => (
                <div key={tab.id} className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-800/60">
                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === tab.id ? '' : tab.id)}
                    aria-expanded={activeTab === tab.id}
                    aria-controls={`panel-${tab.id}`}
                    className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-gray-800 dark:text-gray-200 hover:bg-rose-50/50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <span>{tab.label}</span>
                    <span className="text-gray-400 font-bold">{activeTab === tab.id ? '−' : '+'}</span>
                  </button>
                  {activeTab === tab.id && (
                    <div id={`panel-${tab.id}`} className="px-4 pb-4 pt-1 text-xs text-gray-500 dark:text-gray-400 leading-relaxed border-t border-gray-50 dark:border-gray-700/50">
                      {tab.content}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-6">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Shield size={14} className="text-green-500" /> Secure Checkout
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Truck size={14} className="text-blue-500" /> Nationwide delivery
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Mobile Purchase Bar */}
        {product.countInStock > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 shadow-2xl">
            <div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">{qty > 1 ? `Total · ${qty} items` : 'Price'}</p>
              <p className="text-lg font-black text-[#1A0A0E] dark:text-gray-100">Rs. {Math.round(product.price * qty).toLocaleString()}</p>
            </div>
            <button
              onClick={handleAddToCart}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs transition-all ${
                added ? 'bg-green-600 text-white' : 'bg-[#C2185B] text-white shadow-lg shadow-rose-200 dark:shadow-none'
              }`}
            >
              <ShoppingCart size={14} />
              {added ? 'Added!' : 'Add to Cart'}
            </button>
          </div>
        )}

        {/* ── Reviews Section ── */}
        <ReviewsSection productId={id} />

        {/* ── Related Products ── */}
        {related.length > 0 && (
          <div className="mt-16 pt-8 border-t border-gray-100 dark:border-gray-800">
            <h2 className="text-2xl font-bold text-[#1A0A0E] dark:text-gray-100 mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface Review { _id: string; name: string; rating: number; comment: string; createdAt: string; }

function ReviewsSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews/${productId}`);
      if (res.ok) setReviews(await res.json());
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [productId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  if (loading) return null;
  if (reviews.length === 0) return (
    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
      <h2 className="text-2xl font-bold text-[#1A0A0E] dark:text-gray-100 mb-2">Customer Reviews</h2>
      <p className="text-gray-400 dark:text-gray-500 text-sm">No reviews yet. Be the first to review after purchasing!</p>
    </div>
  );

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#1A0A0E] dark:text-gray-100">Customer Reviews</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={16} className={s <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-700 text-gray-200 dark:text-gray-700'} />
              ))}
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{avg.toFixed(1)} out of 5 · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map(r => (
          <div key={r._id} className="bg-[#FFF8F5] dark:bg-gray-800 rounded-2xl p-5 border border-rose-50 dark:border-gray-700">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-sm text-[#1A0A0E] dark:text-gray-100">{r.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(r.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 dark:fill-gray-700 text-gray-200 dark:text-gray-700'} />)}
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
