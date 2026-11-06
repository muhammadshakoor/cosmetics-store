import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] bg-[#FFF8F5] dark:bg-gray-950 flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <p className="text-7xl font-black bg-linear-to-r from-[#C2185B] to-pink-500 bg-clip-text text-transparent mb-4">404</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100 mb-3">This page has drifted away</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or may have moved. Let&apos;s get you back to something lovely.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/products" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl transition-colors">
            <Search size={16} /> Browse products
          </Link>
          <Link href="/" className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-rose-200 dark:border-rose-900/40 text-[#C2185B] dark:text-rose-400 font-semibold rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
            Home <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
