'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, ShoppingCart, ArrowLeft, Heart, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/ProductCard';
import ProductImage from '@/components/ProductImage';
import type { Product } from '@/types/api';
import toast from 'react-hot-toast';

interface Review { _id: string; name?: string; userName?: string; rating: number; comment: string; createdAt: string }

export default function ProductDetail({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const [qty, setQty] = useState(1);
  const [related, setRelated] = useState<Product[]>([]);
  const [restockEmail, setRestockEmail] = useState('');
  const [notifySubmitting, setNotifySubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/products?category=${encodeURIComponent(product.category)}&limit=5`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : [])
      .then((products: Product[]) => { if (!controller.signal.aborted && Array.isArray(products)) setRelated(products.filter((item) => item._id !== product._id).slice(0, 4)); })
      .catch(() => {});
    return () => controller.abort();
  }, [product._id, product.category]);

  function handleAddToCart() {
    if (user?.isAdmin) { toast.error('Use a customer account to shop.'); return; }
    addToCart({ product: product._id, name: product.name, image: product.image, price: product.price, qty, countInStock: product.countInStock });
    toast.success(`${product.name} added to cart`);
  }

  async function handleRestockNotify(event: React.FormEvent) {
    event.preventDefault();
    setNotifySubmitting(true);
    try {
      const response = await fetch('/api/notify-restock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: restockEmail, productId: product._id, productName: product.name }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not register your request.');
      toast.success(result.message || 'Your restock request has been saved.');
      setRestockEmail('');
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Please try again.'); }
    finally { setNotifySubmitting(false); }
  }

  const wishlisted = isWishlisted(product._id);
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 pb-28 dark:bg-gray-950 sm:pb-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/products" className="mb-8 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-rose-600 dark:text-gray-400"><ArrowLeft size={16} /> Back to products</Link>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-rose-50 dark:bg-gray-800">
            <ProductImage src={product.image} alt={product.name} sizes="(max-width: 1024px) 100vw, 50vw" priority className="object-cover" />
            <button onClick={() => toggle(product._id)} aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} aria-pressed={wishlisted} className="absolute right-4 top-4 rounded-full bg-white p-3 shadow-md dark:bg-gray-800"><Heart size={20} className={wishlisted ? 'fill-rose-600 text-rose-600' : 'text-gray-500'} /></button>
          </div>
          <div className="flex flex-col justify-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400">{product.brand}</p>
            <h1 className="mb-4 text-3xl font-extrabold leading-tight sm:text-4xl">{product.name}</h1>
            <a href="#customer-reviews" className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Star size={16} aria-hidden="true" className="fill-amber-400 text-amber-400" />{product.numReviews > 0 ? `${product.rating.toFixed(1)} out of 5 (${product.numReviews} reviews)` : 'No customer reviews yet'}</a>
            <div className="mb-5 flex flex-wrap items-center gap-3"><span className="text-3xl font-black">Rs. {product.price.toLocaleString('en-PK', { maximumFractionDigits: 2 })}</span><span className={`rounded-full px-3 py-1 text-sm font-medium ${product.countInStock > 0 ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'}`}>{product.countInStock > 0 ? `${product.countInStock} in stock` : 'Out of stock'}</span></div>
            <h2 className="mb-2 text-sm font-bold">About this product</h2>
            <p className="mb-6 whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">{product.description}</p>
            {product.countInStock > 0 ? <div className="mb-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-2xl border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
                <button aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((value) => Math.max(1, value - 1))} className="px-4 py-3 text-lg disabled:opacity-40">−</button><output aria-label="Quantity" className="min-w-8 text-center font-semibold">{qty}</output><button aria-label="Increase quantity" disabled={qty >= product.countInStock} onClick={() => setQty((value) => Math.min(product.countInStock, value + 1))} className="px-4 py-3 text-lg disabled:opacity-40">+</button>
              </div>
              <button onClick={handleAddToCart} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-700 px-5 py-3.5 text-sm font-bold text-white hover:bg-rose-800"><ShoppingCart size={17} /> Add to Cart</button>
            </div> : <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><h2 className="mb-2 text-sm font-bold">Request a restock update</h2><form onSubmit={handleRestockNotify} className="flex flex-wrap gap-2"><label htmlFor="restock-email" className="sr-only">Email for restock updates</label><input id="restock-email" type="email" autoComplete="email" required value={restockEmail} onChange={(event) => setRestockEmail(event.target.value)} placeholder="Your email address" className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" /><button disabled={notifySubmitting} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{notifySubmitting ? 'Saving…' : 'Notify Me'}</button></form></div>}
            <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Truck aria-hidden="true" size={17} /> Delivery charges are shown at checkout.</p>
          </div>
        </div>
        <ReviewsSection key={product._id} productId={product._id} />
        {related.length > 0 && <section className="mt-12 border-t border-gray-200 pt-8 dark:border-gray-800"><h2 className="mb-6 text-2xl font-bold">You May Also Like</h2><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{related.map((item) => <ProductCard key={item._id} product={item} />)}</div></section>}
        {product.countInStock > 0 && <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-gray-200 bg-white/95 p-3 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/95 sm:hidden"><p className="font-bold">Rs. {(product.price * qty).toLocaleString('en-PK', { maximumFractionDigits: 2 })}</p><button onClick={handleAddToCart} className="flex-1 rounded-xl bg-rose-700 px-4 py-3 text-sm font-bold text-white">Add {qty} to Cart</button></div>}
      </div>
    </div>
  );
}

function ReviewsSection({ productId }: { productId: string }) {
  const [result, setResult] = useState<{ reviews: Review[]; error: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reviews/${encodeURIComponent(productId)}`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error('Could not load reviews'); return response.json(); })
      .then((reviews: Review[]) => { if (!controller.signal.aborted) setResult({ reviews: Array.isArray(reviews) ? reviews : [], error: false }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ reviews: [], error: true }); });
    return () => controller.abort();
  }, [productId, retry]);
  return <section id="customer-reviews" aria-labelledby="reviews-title" className="mt-12 scroll-mt-24 border-t border-gray-200 pt-8 dark:border-gray-800"><h2 id="reviews-title" className="mb-4 text-2xl font-bold">Customer Reviews</h2>{!result ? <p role="status" className="text-sm text-gray-600 dark:text-gray-400">Loading reviews…</p> : result.error ? <p role="alert" className="text-sm">Could not load reviews. <button className="font-semibold text-rose-600 underline" onClick={() => { setResult(null); setRetry((value) => value + 1); }}>Try again</button></p> : result.reviews.length === 0 ? <p className="text-sm text-gray-600 dark:text-gray-400">No reviews yet. Customers can review products from their delivered orders.</p> : <div className="grid gap-4 md:grid-cols-2">{result.reviews.map((review) => <article key={review._id} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><p className="font-semibold">{review.name || review.userName || 'Customer'}</p><p className="my-2 text-sm text-amber-700 dark:text-amber-400">{review.rating} out of 5</p><p className="whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">{review.comment}</p><time dateTime={review.createdAt} className="mt-3 block text-xs text-gray-500 dark:text-gray-400">{new Date(review.createdAt).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium' })}</time></article>)}</div>}</section>;
}
