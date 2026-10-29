'use client';

import Link from 'next/link';
import { Leaf, ShieldCheck, Truck, HandHeart, Heart, ArrowRight, MessageCircle } from 'lucide-react';
import { whatsappLink } from '@/lib/site';

const VALUES = [
  { icon: <Leaf size={24} className="text-green-600 dark:text-green-400" />, title: '100% Organic', desc: 'Pure plant oils, butters, clays and botanicals — nothing synthetic.' },
  { icon: <ShieldCheck size={24} className="text-blue-600 dark:text-blue-400" />, title: 'Halal & Cruelty-Free', desc: 'Never tested on animals. Paraben and sulfate free.' },
  { icon: <HandHeart size={24} className="text-rose-600 dark:text-rose-400" />, title: 'Handmade', desc: 'Every bar and lotion is made by hand in small batches.' },
  { icon: <Truck size={24} className="text-purple-600 dark:text-purple-400" />, title: 'Nationwide Delivery', desc: 'Cash on Delivery to every city in Pakistan.' },
];

const PROCESS = [
  { step: '01', title: 'Choose the botanicals', desc: 'We start with skin-loving ingredients like rose, neem, turmeric, goat milk and activated charcoal.' },
  { step: '02', title: 'Craft in small batches', desc: 'Soaps are cold-processed and lotions blended by hand, so every batch gets full attention.' },
  { step: '03', title: 'Cure, check & pack', desc: 'Bars are cured until gentle and long-lasting, then checked and packed with care for delivery.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950">

      {/* Hero */}
      <section className="bg-white dark:bg-gray-900 py-14 sm:py-20 px-4 border-b border-rose-50 dark:border-gray-800">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-[#C2185B] uppercase mb-3">Our Story</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1A0A0E] dark:text-gray-100 mb-6 leading-tight">
            Handmade in Pakistan,<br className="hidden sm:block" /> Pure by Nature
          </h1>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Lumina began with one simple belief — skincare should be made from ingredients you can actually pronounce.
            We craft organic soaps, botanical lotions and herbal skincare by hand, in small batches, and deliver them to your door across Pakistan.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="py-14 sm:py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100 text-center mb-10 sm:mb-12">What We Stand For</h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {VALUES.map(({ icon, title, desc }) => (
              <div key={title} className="bg-white dark:bg-gray-800 rounded-3xl p-6 text-center shadow-sm border border-rose-50 dark:border-gray-700 hover:shadow-md transition-all">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">{icon}</div>
                <h3 className="font-bold text-[#1A0A0E] dark:text-gray-100 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-14 sm:py-16 px-4 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <img
            src="/products/organic/artisan-organic-soaps-collection.jpeg"
            alt="A collection of Lumina's handmade organic soaps"
            loading="lazy"
            className="rounded-3xl shadow-xl w-full object-cover aspect-square"
          />
          <div className="space-y-5">
            <h2 className="text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100">How It Started</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Finding gentle, honest skincare in Pakistan was hard. Imported products were expensive, and many local options were full of harsh chemicals with little transparency about what was inside.
            </p>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              So we started making our own — rose soaps, charcoal detox bars, almond lotions — using time-honoured herbal recipes and pure natural ingredients. Today we share them with families across the country.
            </p>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#C2185B] dark:text-rose-400">
              <Heart size={16} className="fill-current" /> Made with love in Pakistan
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-14 sm:py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100 text-center mb-10">How We Make It</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PROCESS.map(({ step, title, desc }) => (
              <li key={step} className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-rose-50 dark:border-gray-700 shadow-sm">
                <span className="text-3xl font-black text-rose-200 dark:text-rose-900">{step}</span>
                <h3 className="font-bold text-[#1A0A0E] dark:text-gray-100 mt-2 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 sm:py-16 px-4 text-center bg-white dark:bg-gray-900">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100 mb-3">Ready to Glow Naturally?</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">Explore the full range, or ask us anything on WhatsApp.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#C2185B] hover:bg-[#A31555] text-white font-bold rounded-2xl shadow-md shadow-rose-200 dark:shadow-none transition-all hover:-translate-y-0.5 text-sm"
          >
            Shop the Collection <ArrowRight size={16} />
          </Link>
          <a
            href={whatsappLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white dark:bg-gray-800 hover:bg-rose-50 dark:hover:bg-gray-700 text-[#C2185B] dark:text-rose-400 font-bold rounded-2xl border border-rose-200 dark:border-rose-900/40 transition-all text-sm"
          >
            <MessageCircle size={16} /> Chat on WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}
