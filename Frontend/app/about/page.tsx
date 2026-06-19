'use client';

import Link from 'next/link';
import { Leaf, ShieldCheck, Truck, Star, Heart } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950">

      {/* Hero */}
      <section className="bg-white dark:bg-gray-900 py-20 px-4 border-b border-rose-50 dark:border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-[#C2185B] uppercase mb-3">Our Story</p>
          <h1 className="text-5xl font-extrabold text-[#1A0A0E] dark:text-gray-100 mb-6 leading-tight">
            Beauty Born in Pakistan,<br />Made for the World
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Lumina was founded with one simple belief — every woman deserves access to premium, cruelty-free cosmetics at honest prices.
            We source the finest ingredients, test every product with care, and deliver straight to your door across Pakistan.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100">What We Stand For</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Leaf size={24} className="text-green-600" />, title: 'Cruelty-Free', desc: 'Never tested on animals. Every single product.' },
              { icon: <ShieldCheck size={24} className="text-blue-600" />, title: 'Halal Certified', desc: 'Safe, permissible ingredients for every skin type.' },
              { icon: <Truck size={24} className="text-purple-600" />, title: 'Nationwide Delivery', desc: 'Fast, reliable shipping across all of Pakistan.' },
              { icon: <Star size={24} className="text-amber-500" />, title: '5-Star Quality', desc: 'Thousands of happy customers and counting.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white dark:bg-gray-800 rounded-3xl p-6 text-center shadow-sm border border-rose-50 dark:border-gray-700 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">{icon}</div>
                <h3 className="font-bold text-[#1A0A0E] dark:text-gray-100 mb-2">{title}</h3>
                <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <img
                src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&auto=format"
                alt="Our products"
                className="rounded-3xl shadow-xl w-full object-cover aspect-square"
              />
            </div>
            <div className="space-y-5">
              <h2 className="text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100">How It Started</h2>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                Lumina started from a simple frustration: finding high-quality, safe cosmetics in Pakistan was hard. Imported brands were expensive, and local options often lacked transparency about ingredients.
              </p>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm">
                We set out to change that. Today, Lumina brings you carefully curated cosmetics — from hydrating serums to bold lipsticks — all halal certified, cruelty-free, and delivered with love.
              </p>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#C2185B]">
                <Heart size={16} className="fill-[#C2185B]" /> Made with love for Pakistani women
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl font-extrabold text-[#1A0A0E] dark:text-gray-100 mb-4">Ready to Glow?</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Explore our full range of premium cosmetics and beauty essentials.</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#C2185B] hover:bg-[#A31555] text-white font-bold rounded-2xl shadow-md shadow-rose-200 dark:shadow-rose-900/30 transition-all hover:-translate-y-0.5 text-sm"
          >
            Shop Now
          </Link>
          <Link
            href="/products?category=skincare"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-[#C2185B] dark:text-rose-400 font-bold rounded-2xl border border-rose-200 dark:border-rose-900/40 shadow-md shadow-rose-100 dark:shadow-rose-900/20 transition-all hover:-translate-y-0.5 text-sm"
          >
            Explore Skincare
          </Link>
          <Link
            href="/products?category=makeup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-[#C2185B] dark:text-rose-400 font-bold rounded-2xl border border-rose-200 dark:border-rose-900/40 shadow-md shadow-rose-100 dark:shadow-rose-900/20 transition-all hover:-translate-y-0.5 text-sm"
          >
            Explore Makeup
          </Link>
          <Link
            href="/products?category=fragrance"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-[#C2185B] dark:text-rose-400 font-bold rounded-2xl border border-rose-200 dark:border-rose-900/40 shadow-md shadow-rose-100 dark:shadow-rose-900/20 transition-all hover:-translate-y-0.5 text-sm"
          >
            Explore Fragrance
          </Link>
          <Link
            href="/products?category=jewelry"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-[#C2185B] dark:text-rose-400 font-bold rounded-2xl border border-rose-200 dark:border-rose-900/40 shadow-md shadow-rose-100 dark:shadow-rose-900/20 transition-all hover:-translate-y-0.5 text-sm"
          >
            Explore Jewellery
          </Link>
        </div>
      </section>
    </div>
  );
}
