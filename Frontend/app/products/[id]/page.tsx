'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star, ShoppingCart, ArrowLeft, Heart, Shield, Truck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { API_URL } from '@/lib/api';
import type { ProductType } from '@/components/ProductCard';
import toast from 'react-hot-toast';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_URL}/products/${id}`);
        if (res.ok) {
          setProduct(await res.json());
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
    addToCart({
      product: product._id,
      name: product.name,
      image: product.image,
      price: product.price,
      qty,
      countInStock: product.countInStock,
    });
    setAdded(true);
    toast.success(`${product.name} added to cart!`);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-gray-200 rounded-3xl h-96 animate-pulse" />
          <div className="space-y-4">
            {[80, 40, 60, 30, 50].map((w, i) => (
              <div key={i} className={`bg-gray-200 rounded-xl h-6 animate-pulse w-${w}`} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Product not found</h2>
          <button onClick={() => router.push('/products')} className="mt-4 px-6 py-3 bg-rose-500 text-white rounded-2xl hover:bg-rose-600 transition-colors">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-500 hover:text-rose-500 transition-colors mb-8 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to products
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Image */}
          <div className="relative">
            <div className="rounded-3xl overflow-hidden bg-gradient-to-br from-rose-50 to-pink-50 aspect-square shadow-lg">
              <img
                src={product.image || `https://picsum.photos/seed/${product._id}/600/600`}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            <button className="absolute top-4 right-4 p-3 bg-white rounded-full shadow-md hover:scale-110 transition-transform">
              <Heart size={18} className="text-rose-400" />
            </button>
          </div>

          {/* Product Info */}
          <div className="flex flex-col justify-center">
            <p className="text-sm text-rose-500 font-semibold uppercase tracking-widest mb-2">{product.brand}</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={16}
                    className={s <= Math.round(product.rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500">{product.rating.toFixed(1)} ({product.numReviews} reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-black text-gray-900">Rs. {Math.round(product.price).toLocaleString()}</span>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${product.countInStock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                {product.countInStock > 0 ? `${product.countInStock} in stock` : 'Out of Stock'}
              </span>
            </div>

            <p className="text-gray-600 leading-relaxed mb-8">{product.description || 'A premium cosmetic product crafted for your beauty routine.'}</p>

            {/* Qty + Add to Cart */}
            {product.countInStock > 0 && (
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors font-bold text-lg"
                  >
                    −
                  </button>
                  <span className="px-5 py-3 font-semibold text-gray-900 border-x border-gray-200">{qty}</span>
                  <button
                    onClick={() => setQty(Math.min(product.countInStock, qty + 1))}
                    className="px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors font-bold text-lg"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all ${
                    added
                      ? 'bg-green-500 text-white'
                      : 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg hover:shadow-rose-200 hover:-translate-y-0.5'
                  }`}
                >
                  <ShoppingCart size={16} />
                  {added ? 'Added to Cart!' : 'Add to Cart'}
                </button>
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Shield size={14} className="text-green-500" /> Secure Checkout
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Truck size={14} className="text-blue-500" /> Free shipping Rs. 2,000+
              </div>
            </div>
          </div>
        </div>

        {/* ── Reviews Section ── */}
        <ReviewsSection productId={id} />
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
    <div className="mt-12 pt-8 border-t border-gray-100">
      <h2 className="text-2xl font-bold text-[#1A0A0E] mb-2">Customer Reviews</h2>
      <p className="text-gray-400 text-sm">No reviews yet. Be the first to review after purchasing!</p>
    </div>
  );

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <div className="mt-12 pt-8 border-t border-gray-100">
      <div className="flex items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#1A0A0E]">Customer Reviews</h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={16} className={s <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
              ))}
            </div>
            <span className="text-sm text-gray-500 font-medium">{avg.toFixed(1)} out of 5 · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reviews.map(r => (
          <div key={r._id} className="bg-[#FFF8F5] rounded-2xl p-5 border border-rose-50">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-sm text-[#1A0A0E]">{r.name}</p>
                <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />)}
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
