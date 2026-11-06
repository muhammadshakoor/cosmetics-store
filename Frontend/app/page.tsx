'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, Truck, ChevronRight, Heart, Search } from 'lucide-react';
import ProductCard, { type ProductType } from '@/components/ProductCard';
import ProductImage from '@/components/ProductImage';
import { API_URL } from '@/lib/api';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/store';

const categories = [
  { name: 'Handmade Soaps', slug: 'soaps',    image: '/products/organic/artisan-organic-soaps-collection.jpeg', desc: 'Explore your next bath-time favorite' },
  { name: 'Skincare',       slug: 'skincare', image: '/products/organic/manjistha-rose-organic-soap.jpeg',      desc: 'Make time for your routine' },
  { name: 'Body Care',      slug: 'bodycare', image: '/products/organic/homemade-almond-rose-lotion.jpeg',      desc: 'Everyday body care' },
  { name: 'Hair Care',      slug: 'haircare', image: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=600&h=700&fit=crop&auto=format', desc: 'Revive & shine' },
  { name: 'Fragrance',      slug: 'fragrance',image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&h=700&fit=crop&auto=format', desc: 'Find your signature scent' },
];

const shoppingGuides = [
  { title: 'Find your everyday skincare', text: 'Compare product descriptions and textures, then choose the items that fit your preferences.', href: '/products?category=skincare', label: 'Explore skincare' },
  { title: 'Make bath time your own', text: 'Browse handmade soaps and body care, and check each product for the details that matter to you.', href: '/products?category=soaps', label: 'Explore handmade soaps' },
  { title: 'Shop with the details in view', text: 'Check stock and customer reviews on product pages, then review current prices and delivery charges at checkout.', href: '/faq', label: 'Read shopping FAQs' },
];

const marqueeItems = ['✦ SKINCARE & BODY CARE', '✦ EXPLORE HANDMADE SOAPS', `✦ FREE DELIVERY FROM PKR ${FREE_SHIPPING_THRESHOLD.toLocaleString('en-PK')}`, '✦ CASH ON DELIVERY', '✦ DISCOVER YOUR NEXT FAVORITE'];

export default function HomePage() {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [productsAttempt, setProductsAttempt] = useState(0);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim() || !newsletterConsent || newsletterStatus === 'loading') return;
    setNewsletterStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail, consent: true }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.message || 'We could not save your subscription. Please try again.');
      setNewsletterMessage(result.message || 'Your subscription has been saved.');
      setNewsletterStatus('success'); setNewsletterEmail('');
    } catch {
      setNewsletterMessage('We could not save your subscription. Please try again later.');
      setNewsletterStatus('error');
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/products?limit=4`, { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error('Catalog unavailable'); return response.json(); })
      .then((data: ProductType[]) => { if (!Array.isArray(data)) throw new Error('Catalog unavailable'); if (!controller.signal.aborted) { setProducts(data); setProductsError(false); } })
      .catch(() => { if (!controller.signal.aborted) setProductsError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [productsAttempt]);

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950">

      {/* ── Announcement Bar ── */}
      <div className="bg-[#C2185B] text-white text-xs font-medium text-center py-2.5 px-4 tracking-wide">
        FREE delivery from PKR {FREE_SHIPPING_THRESHOLD.toLocaleString('en-PK')} &nbsp;·&nbsp; Cash on Delivery in Pakistan
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
                <span className="text-xs font-semibold text-[#C2185B] tracking-widest uppercase">Everyday Beauty Rituals</span>
              </div>

              <h1 className="text-5xl sm:text-6xl xl:text-7xl font-extrabold text-[#1A0A0E] dark:text-gray-100 leading-[1.05] tracking-tight">
                Beauty In Its{' '}
                <span className="relative inline-block">
                  <span className="bg-linear-to-r from-[#C2185B] to-pink-500 bg-clip-text text-transparent">Purest Form</span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 10" fill="none">
                    <path d="M2 7 Q75 2 150 7 Q225 12 298 7" stroke="#C2185B" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4"/>
                  </svg>
                </span>
              </h1>

              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
                Explore handmade soaps, skincare, body care, and fragrance. Find the details, prices, and everyday favorites that make your routine feel like yours.
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
                  <Link href="/products?category=soaps" className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-[#1A0A0E] dark:text-gray-100 font-semibold rounded-2xl shadow-md shadow-gray-200 dark:shadow-gray-900/40 border border-gray-100 dark:border-gray-700 transition-all text-sm">
                    Handmade Soaps <ChevronRight size={15} />
                  </Link>
                  <Link href="/products?category=bodycare" className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-[#1A0A0E] dark:text-gray-100 font-semibold rounded-2xl shadow-md shadow-gray-200 dark:shadow-gray-900/40 border border-gray-100 dark:border-gray-700 transition-all text-sm">
                    Body Care <ChevronRight size={15} />
                  </Link>
                  <Link href="/products?category=haircare" className="inline-flex items-center justify-center gap-1.5 px-4 py-3.5 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-[#1A0A0E] dark:text-gray-100 font-semibold rounded-2xl shadow-md shadow-gray-200 dark:shadow-gray-900/40 border border-gray-100 dark:border-gray-700 transition-all text-sm">
                    Hair Care <ChevronRight size={15} />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 sm:flex sm:flex-wrap sm:gap-x-6">
                {[
                  { icon: <ShoppingBag size={14} className="text-rose-600" />, text: 'Shop by Category' },
                  { icon: <Heart size={14} className="text-rose-600" />, text: 'Save Your Favorites' },
                  { icon: <Truck size={14} className="text-blue-500" />, text: 'Delivery in Pakistan' },
                  { icon: <Search size={14} className="text-purple-500" />, text: 'Compare Product Details' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">{icon} {text}</div>
                ))}
              </div>
            </div>

            {/* Right — Product collage */}
            <div className="relative hidden md:block h-[440px] lg:h-[520px]">
              <div className="absolute top-0 right-0 w-64 h-64 lg:w-72 lg:h-72 rounded-3xl overflow-hidden shadow-2xl shadow-rose-100 rotate-3">
                <ProductImage src="/products/organic/artisan-organic-soaps-collection.jpeg" alt="Handmade soaps collection" sizes="(min-width: 1024px) 288px, 256px" priority className="object-cover" />
              </div>
              <div className="absolute bottom-0 left-4 lg:left-8 w-56 h-56 lg:w-64 lg:h-64 rounded-3xl overflow-hidden shadow-2xl shadow-pink-100 -rotate-2">
                <ProductImage src="/products/organic/homemade-almond-rose-lotion.jpeg" alt="Almond and rose body lotion" sizes="(min-width: 1024px) 256px, 224px" className="object-cover" />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 lg:w-44 lg:h-44 rounded-3xl overflow-hidden shadow-xl shadow-rose-200 rotate-1 border-4 border-white dark:border-gray-800">
                <ProductImage src="/products/organic/manjistha-rose-organic-soap.jpeg" alt="Rose-shaped handmade soap" sizes="176px" className="object-cover" />
              </div>
              <div className="absolute top-6 left-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2 border border-rose-50 dark:border-gray-700">
                <Heart size={16} aria-hidden="true" className="text-rose-600" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">Find Your Next Favorite</span>
              </div>
              <div className="absolute bottom-12 right-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg px-4 py-3 border border-rose-50 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">🚚 Cash on Delivery</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pay when your order arrives</p>
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
                <ProductImage src={cat.image} alt={cat.name} sizes="(max-width: 640px) 65vw, (max-width: 768px) 45vw, 20vw" className="object-cover group-hover:scale-110 transition-transform duration-700" />
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
              <p className="text-xs font-bold tracking-[0.2em] text-[#C2185B] uppercase mb-2">From Our Catalog</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A0A0E] dark:text-gray-100">Latest Arrivals</h2>
            </div>
            <Link href="/products" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#C2185B] hover:gap-2.5 transition-all">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-3xl h-80 bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
            </div>
          ) : productsError ? (
            <div role="alert" className="py-12 text-center"><p className="mb-4 text-gray-600 dark:text-gray-400">We could not load the latest products.</p><button onClick={() => { setLoading(true); setProductsAttempt((attempt) => attempt + 1); }} className="rounded-xl bg-rose-700 px-5 py-3 font-semibold text-white">Try again</button></div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((p) => <ProductCard key={p._id} product={p} />)}
            </div>
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-400 py-16">No products are currently listed. Please check back later.</p>
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
            { icon: '🔎', title: 'Product Details', desc: 'Read descriptions and check availability' },
            { icon: '🚚', title: 'Cash on Delivery', desc: 'Pay when your order arrives' },
            { icon: '📦', title: 'Order Updates', desc: 'Follow your orders in your account' },
            { icon: '💬', title: 'Customer Support', desc: 'Get help with your products and orders' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white dark:bg-gray-800 rounded-3xl p-6 text-center shadow-sm border border-rose-50 dark:border-gray-700 hover:shadow-md hover:-translate-y-1 transition-all">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="font-bold text-[#1A0A0E] dark:text-gray-100 text-sm mb-1">{title}</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Shopping Guidance ── */}
      <section className="py-10 sm:py-14 lg:py-20 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-xs font-bold tracking-[0.2em] text-[#C2185B] uppercase mb-2">A Little Shopping Inspiration</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1A0A0E] dark:text-gray-100">Make Room for Your Ritual</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {shoppingGuides.map((guide) => <article key={guide.title} className="bg-[#FFF8F5] dark:bg-gray-800 rounded-3xl p-7 border border-rose-50 dark:border-gray-700"><h3 className="mb-3 text-lg font-bold text-[#1A0A0E] dark:text-gray-100">{guide.title}</h3><p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{guide.text}</p><Link href={guide.href} className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-400">{guide.label}<ArrowRight size={15} /></Link></article>)}
          </div>
        </div>
      </section>

      {/* ── Newsletter ── */}
      <section className="py-10 sm:py-14 lg:py-20 px-4 bg-linear-to-r from-[#C2185B] to-pink-500">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3">Stay in the Loop</h2>
          <p className="text-rose-100 text-sm mb-8">Sign up for Lumina store news and new arrivals.</p>
          {newsletterStatus === 'success' ? (
            <div role="status" className="bg-white/20 border border-white/30 rounded-2xl px-6 py-4 text-white font-semibold">
              {newsletterMessage}
            </div>
          ) : (
            <form onSubmit={handleNewsletter} className="space-y-4 text-left">
              <div className="flex flex-col sm:flex-row gap-3">
              <label htmlFor="newsletter-email" className="sr-only">Email address for store updates</label>
              <input
                id="newsletter-email" name="email" type="email" autoComplete="email" required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="Enter your email address"
                className="flex-1 px-5 py-3.5 rounded-2xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <button
                type="submit" disabled={newsletterStatus === 'loading' || !newsletterConsent}
                className="px-6 py-3.5 bg-[#1A0A0E] hover:bg-black text-white font-bold rounded-2xl text-sm transition-colors whitespace-nowrap disabled:opacity-60"
              >
                {newsletterStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
              </button>
              </div>
              <label className="flex items-start gap-3 text-sm leading-relaxed text-white"><input type="checkbox" name="consent" required checked={newsletterConsent} onChange={(event) => setNewsletterConsent(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-rose-950" /><span>I agree to receive Lumina news and offers by email. Read our <Link href="/privacy" className="font-semibold underline">Privacy Policy</Link>.</span></label>
            </form>
          )}
          {newsletterStatus === 'error' && (
            <p role="alert" className="text-white text-sm mt-3">{newsletterMessage}</p>
          )}
        </div>
      </section>

    </div>
  );
}
