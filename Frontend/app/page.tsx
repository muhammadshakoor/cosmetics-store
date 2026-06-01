'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Shield, Leaf, Star } from 'lucide-react';
import ProductCard, { type ProductType } from '@/components/ProductCard';
import { API_URL } from '@/lib/api';

const mockProducts: ProductType[] = [
  { _id: 'm1', name: 'Rose Petal Glow Serum', image: 'https://picsum.photos/seed/rose/400/400', brand: 'Lumina', category: 'skincare', description: '', rating: 4.8, numReviews: 124, price: 48, countInStock: 15 },
  { _id: 'm2', name: 'Velvet Matte Lipstick', image: 'https://picsum.photos/seed/lipstick/400/400', brand: 'Lumina', category: 'makeup', description: '', rating: 4.6, numReviews: 87, price: 24, countInStock: 30 },
  { _id: 'm3', name: 'Hydra-Boost Moisturizer', image: 'https://picsum.photos/seed/moisturizer/400/400', brand: 'Lumina', category: 'skincare', description: '', rating: 4.9, numReviews: 203, price: 62, countInStock: 8 },
  { _id: 'm4', name: 'Golden Hour Highlighter', image: 'https://picsum.photos/seed/highlight/400/400', brand: 'Lumina', category: 'makeup', description: '', rating: 4.7, numReviews: 56, price: 35, countInStock: 20 },
];

const categories = [
  { name: 'Skincare', slug: 'skincare', color: 'from-emerald-400 to-teal-500', desc: 'Nourish & Protect' },
  { name: 'Makeup', slug: 'makeup', color: 'from-rose-400 to-pink-500', desc: 'Define & Enhance' },
  { name: 'Fragrance', slug: 'fragrance', color: 'from-purple-400 to-violet-500', desc: 'Captivate & Inspire' },
  { name: 'Hair Care', slug: 'haircare', color: 'from-amber-400 to-orange-500', desc: 'Revive & Shine' },
];

export default function HomePage() {
  const [products, setProducts] = useState<ProductType[]>(mockProducts);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_URL}/products?limit=4`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setProducts(data);
        }
      } catch {
        // use mock data
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-br from-rose-50 via-pink-50 to-purple-50 py-24 px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-rose-200 rounded-full blur-3xl opacity-30" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-pink-200 rounded-full blur-3xl opacity-30" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-rose-600 text-sm font-medium shadow-sm mb-6">
            <Sparkles size={14} />
            New Spring Collection 2025
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            Reveal Your{' '}
            <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
              Natural Glow
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Premium cosmetics crafted with love. Cruelty-free, sustainably sourced, and made for every skin type.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-4 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-rose-200 hover:-translate-y-0.5"
            >
              Shop Now <ArrowRight size={18} />
            </Link>
            <Link
              href="/products?category=skincare"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-2xl transition-all shadow-sm border border-gray-200 hover:-translate-y-0.5"
            >
              Explore Skincare
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { icon: <Leaf size={20} />, label: 'Cruelty-Free', desc: '100% not tested on animals' },
            { icon: <Shield size={20} />, label: 'Dermatologist Tested', desc: 'Safe for all skin types' },
            { icon: <Star size={20} />, label: '5-Star Reviews', desc: 'Loved by 50,000+ customers' },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-4 p-4 rounded-2xl bg-rose-50">
              <div className="p-3 bg-rose-100 rounded-xl text-rose-600">{f.icon}</div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{f.label}</p>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Shop by Category</h2>
            <p className="text-gray-500">Find exactly what you need for your beauty routine.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="group relative overflow-hidden rounded-3xl aspect-square"
              >
                <div className={`absolute inset-0 bg-linear-to-br ${cat.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
                  <h3 className="text-xl font-bold mb-1">{cat.name}</h3>
                  <p className="text-sm opacity-80">{cat.desc}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Shop Now <ArrowRight size={12} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-1">New Arrivals</h2>
              <p className="text-gray-500">Freshly curated for the season</p>
            </div>
            <Link href="/products" className="hidden sm:flex items-center gap-2 text-rose-600 hover:text-rose-700 font-medium transition-colors">
              View all <ArrowRight size={16} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-100 rounded-3xl h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {products.slice(0, 4).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
          <div className="text-center mt-10 sm:hidden">
            <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-2xl font-semibold shadow-sm">
              View All <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
