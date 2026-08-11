'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Star, ShieldCheck, Leaf, Truck, RefreshCw, ChevronRight, Quote } from 'lucide-react';
import ProductCard, { type ProductType } from '@/components/ProductCard';
import { API_URL } from '@/lib/api';

const categories = [
  { name: 'Skincare',  slug: 'skincare',  image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=700&fit=crop&auto=format', desc: 'Glow from within' },
  { name: 'Makeup',    slug: 'makeup',    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=700&fit=crop&auto=format', desc: 'Define your look' },
  { name: 'Jewellery', slug: 'jewelry',   image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&h=700&fit=crop&auto=format', desc: 'Shine & sparkle' },
  { name: 'Fragrance', slug: 'fragrance', image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&h=700&fit=crop&auto=format', desc: 'Captivate & inspire' },
  { name: 'Hair Care', slug: 'haircare',  image: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=600&h=700&fit=crop&auto=format', desc: 'Revive & shine' },
];

const testimonials = [
  { name: 'Ayesha K.',  city: 'Lahore',   text: 'The Rose Serum transformed my skin in just 2 weeks. Delivery was fast and packaging was beautiful!',               stars: 5, product: 'Rose Petal Glow Serum' },
  { name: 'Sana M.',    city: 'Karachi',   text: 'Finally a store with international quality! The Hydra-Boost Moisturizer is my new holy grail. Highly recommend!', stars: 5, product: 'Hydra-Boost Moisturizer' },
  { name: 'Fatima R.',  city: 'Islamabad', text: 'Ordered the lipstick and it arrived same day. The matte formula stays on all day, absolutely love it!',            stars: 5, product: 'Velvet Matte Lipstick' },
];

const marqueeItems = ['✦ FREE DELIVERY', '✦ CASH ON DELIVERY', '✦ JAZZCASH & EASYPAISA', '✦ 100% CRUELTY FREE', '✦ HALAL CERTIFIED', '✦ AUTHENTIC PRODUCTS', '✦ NATIONWIDE SHIPPING', '✦ 5-STAR REVIEWS'];

export default function HomePage() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      if (res.ok) { setNewsletterStatus('success'); setNewsletterEmail(''); }
      else setNewsletterStatus('error');
    } catch {
      setNewsletterStatus('error');
    }
  };

  useEffect(() => {
    fetch(`${API_URL}/products?limit=4`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950">

      {/* ── Announcement Bar ── */}
      <div className="bg-[#C2185B] text-white text-xs font-medium text-center py-2.5 px-4 tracking-wide">
        🎉 FREE delivery on orders over PKR 2,000 &nbsp;·&nbsp; Cash on Delivery available nationwide &nbsp;·&nbsp; Use code <span className="font-bold underline">LUMINA10</span> for 10% off
      </div>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[#FFF8F5] dark:bg-gray-950 py-8 sm:py-14 lg:py-20 lg:min-h-[80vh] flex items-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[55%] h-full bg-linear-to-bl from-rose-100/60 via-pink-50/40 to-transparent dark:from-rose-900/10 dark:via-transparent" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-rose-200/20 dark:bg-rose-900/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-4 lg:py-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            {/* Left */}
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-rose-100 dark:border-gray-700 px-4 py-2 rounded-full shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#C2185B] animate-pulse" />
                <span className="text-xs font-semibold text-[#C2185B] tracking-widest uppercase">New Spring Collection 2025</span>
              </div>

              <h1 className="text-5xl sm:text-6xl xl:text-7xl font-extrabold text-[#1A0A0E] dark:text-gray-100 leading-[1.05] tracking-tight">
                Beauty Is Your{' '}
                <span className="relative inline-block">
                  <span className="bg-linear-to-r from-[#C2185B] to-pink-500 bg-clip-text text-transparent">Superpower</span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 10" fill="none">
                    <path d="M2 7 Q75 2 150 7 Q225 12 298 7" stroke="#C2185B" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4"/>
                  </svg>
                </span>
              </h1>

              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
                Premium cosmetics crafted with care — cruelty-free, halal certified, and made for every skin type. Delivered across Pakistan.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {/* Shop Now — full width on mobile */}
                <Link href="/products" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#C2185B] hover:bg-[#A31555] text-white font-bold rounded-2xl shadow-md shadow-rose-200 dark:shadow-rose-900/30 hover:-translate-y-0.5 transition-all text-sm w-full sm:w-auto">
                  Shop Now <ArrowRight size={16} />
                </Link>
                {/* Category buttons — 2 per row on mobile */}
                <div className="grid grid-cols-2 gap-3 sm:contents">
                  <Link href="/products?category=skincare" className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-[#1A0A0E] dark:text-gray-100 font-semibold rounded-2xl shadow-md shadow-gray-200 dark:shadow-gray-900/40 border border-gray-100 dark:border-gray-700 transition-all text-sm">
                    Skincare <ChevronRight size={15} />
                  </Link>
                  <Link href="/products?category=makeup" className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-[#1A0A0E] dark:text-gray-100 font-semibold rounded-2xl shadow-md shadow-gray-200 dark:shadow-gray-900/40 border border-gray-100 dark:border-gray-700 transition-all text-sm">
                    Makeup <ChevronRight size={15} />
                  </Link>
                  <Link href="/products?category=fragrance" className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-[#1A0A0E] dark:text-gray-100 font-semibold rounded-2xl shadow-md shadow-gray-200 dark:shadow-gray-900/40 border border-gray-100 dark:border-gray-700 transition-all text-sm">
                    Fragrance <ChevronRight size={15} />
                  </Link>
                  <Link href="/products?category=jewelry" className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-[#1A0A0E] dark:text-gray-100 font-semibold rounded-2xl shadow-md shadow-gray-200 dark:shadow-gray-900/40 border border-gray-100 dark:border-gray-700 transition-all text-sm">
                    Jewellery <ChevronRight size={15} />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 sm:flex sm:flex-wrap sm:gap-x-6">
                {[
                  { icon: <ShieldCheck size={14} className="text-green-600" />, text: '100% Authentic' },
                  { icon: <Leaf size={14} className="text-green-600" />, text: 'Cruelty-Free' },
                  { icon: <Truck size={14} className="text-blue-500" />, text: 'Nationwide Delivery' },
                  { icon: <RefreshCw size={14} className="text-purple-500" />, text: '7-Day Returns' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">{icon} {text}</div>
                ))}
              </div>
            </div>

            {/* Right — Product collage */}
            <div className="relative hidden md:block h-[440px] lg:h-[520px]">
              <div className="absolute top-0 right-0 w-64 h-64 lg:w-72 lg:h-72 rounded-3xl overflow-hidden shadow-2xl shadow-rose-100 rotate-3">
                <img src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop&auto=format" alt="Serum" loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="absolute bottom-0 left-4 lg:left-8 w-56 h-56 lg:w-64 lg:h-64 rounded-3xl overflow-hidden shadow-2xl shadow-pink-100 -rotate-2">
                <img src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop&auto=format" alt="Makeup" loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 lg:w-44 lg:h-44 rounded-3xl overflow-hidden shadow-xl shadow-rose-200 rotate-1 border-4 border-white dark:border-gray-800">
                <img src="https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=300&h=300&fit=crop&auto=format" alt="Moisturizer" loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div className="absolute top-6 left-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2 border border-rose-50 dark:border-gray-700">
                <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={11} className="fill-amber-400 text-amber-400" />)}</div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">50K+ Happy Customers</span>
              </div>
              <div className="absolute bottom-12 right-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg px-4 py-3 border border-rose-50 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">🚚 Cash on Delivery</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Available Nationwide</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee Strip ── */}
      <div className="bg-[#1A0A0E] text-white py-3 overflow-hidden">
        <div className="flex gap-12 animate-marquee text-xs font-semibold tracking-widest uppercase whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="shrink-0">{item}</span>
          ))}
        </div>
      </div>

      {/* ── Categories ── */}
      <section className="py-10 sm:py-14 lg:py-20 px-4 bg-[#FFF8F5] dark:bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-xs font-bold tracking-[0.2em] text-[#C2185B] uppercase mb-2">Explore Our Range</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A0A0E] dark:text-gray-100">Shop by Category</h2>
          </div>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 md:pb-0 md:grid md:grid-cols-5">
            {categories.map((cat) => (
              <Link key={cat.slug} href={`/products?category=${cat.slug}`} className="group relative overflow-hidden rounded-3xl aspect-[3/4] block shrink-0 snap-center w-[65%] sm:w-[45%] md:w-auto">
                <img src={cat.image} alt={cat.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-xs text-rose-300 font-medium mb-1">{cat.desc}</p>
                  <h3 className="text-xl font-extrabold text-white">{cat.name}</h3>
                  <div className="flex items-center gap-1 mt-2 text-white/70 text-xs font-medium group-hover:gap-2 transition-all">
                    Shop Now <ArrowRight size={12} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Best Sellers ── */}
      <section className="py-10 sm:py-14 lg:py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-8 sm:mb-12">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-[#C2185B] uppercase mb-2">Hand-picked for you</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A0A0E] dark:text-gray-100">Best Sellers</h2>
            </div>
            <Link href="/products" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#C2185B] hover:gap-2.5 transition-all">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-3xl h-80 bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          ) : (
            <p className="text-center text-gray-400 dark:text-gray-500 py-16">
              Visit <a href="/api/seed" className="text-rose-500 underline">/api/seed</a> to add sample products
            </p>
          )}
          <div className="text-center mt-8 sm:hidden">
            <Link href="/products" className="inline-flex items-center gap-2 px-8 py-3 bg-[#C2185B] text-white font-bold rounded-2xl text-sm">
              View All Products <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Brand Values ── */}
      <section className="py-10 sm:py-14 px-4 bg-[#FFF8F5] dark:bg-gray-950">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { icon: '🌿', title: 'Cruelty-Free', desc: '100% never tested on animals' },
            { icon: '☪️', title: 'Halal Certified', desc: 'Safe and permissible ingredients' },
            { icon: '🚚', title: 'Free Delivery', desc: 'On orders over PKR 2,000' },
            { icon: '💳', title: 'Easy Payments', desc: 'JazzCash · EasyPaisa · COD' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white dark:bg-gray-800 rounded-3xl p-6 text-center shadow-sm border border-rose-50 dark:border-gray-700 hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-bold text-[#1A0A0E] dark:text-gray-100 text-sm mb-1">{title}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-10 sm:py-14 lg:py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-xs font-bold tracking-[0.2em] text-[#C2185B] uppercase mb-2">Real Reviews</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A0A0E] dark:text-gray-100">What Our Customers Say</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-[#FFF8F5] dark:bg-gray-800 rounded-3xl p-7 border border-rose-50 dark:border-gray-700 hover:shadow-lg transition-shadow">
                <Quote size={24} className="text-rose-200 dark:text-rose-900 mb-4" />
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-6 italic">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#1A0A0E] dark:text-gray-100 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{t.city} · {t.product}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, i) => <Star key={i} size={12} className="fill-amber-400 text-amber-400" />)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="py-10 sm:py-14 lg:py-20 px-4 bg-linear-to-r from-[#C2185B] to-pink-500">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3">Get 10% Off Your First Order</h2>
          <p className="text-rose-100 text-sm mb-8">Subscribe for beauty tips, new arrivals, and exclusive offers.</p>
          {newsletterStatus === 'success' ? (
            <div className="bg-white/20 border border-white/30 rounded-2xl px-6 py-4 text-white font-semibold">
              🎉 You&apos;re subscribed! Check your inbox for your 10% off code.
            </div>
          ) : (
            <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email" required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 px-5 py-3.5 rounded-2xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit" disabled={newsletterStatus === 'loading'}
                className="px-6 py-3.5 bg-[#1A0A0E] hover:bg-black text-white font-bold rounded-2xl text-sm transition-colors whitespace-nowrap disabled:opacity-60"
              >
                {newsletterStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          )}
          {newsletterStatus === 'error' && (
            <p className="text-red-200 text-xs mt-2">Something went wrong. Please try again.</p>
          )}
        </div>
      </section>

    </div>
  );
}
