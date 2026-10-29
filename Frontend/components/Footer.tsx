import Link from 'next/link';
import { Mail, Truck, Banknote, MessageCircle } from 'lucide-react';
import { SUPPORT_EMAIL, PHONE_DISPLAY, whatsappLink } from '@/lib/site';

export default function Footer() {
  return (
    <footer className="bg-rose-50/60 dark:bg-gray-950 text-gray-600 dark:text-gray-300 border-t border-rose-100 dark:border-gray-800/80 mt-auto transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-xs">
                <span className="text-white text-xs font-bold">L</span>
              </div>
              <span className="text-xl font-extrabold bg-linear-to-r from-rose-600 to-pink-500 bg-clip-text text-transparent">Lumina</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Premium organic cosmetics and handcrafted skincare. Cruelty-free, 100% natural, halal certified, delivered across Pakistan.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <li>
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                  <MessageCircle size={14} aria-hidden="true" /> {PHONE_DISPLAY} (WhatsApp)
                </a>
              </li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                  <Mail size={14} aria-hidden="true" /> {SUPPORT_EMAIL}
                </a>
              </li>
              <li className="inline-flex items-center gap-2"><Truck size={14} aria-hidden="true" /> Free delivery over Rs. 2,000</li>
            </ul>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">All Products</Link></li>
              <li><Link href="/products?category=skincare" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">Skincare</Link></li>
              <li><Link href="/products?category=soaps" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">Handmade Soaps</Link></li>
              <li><Link href="/products?category=bodycare" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">Body Care</Link></li>
              <li><Link href="/products?category=haircare" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">Hair Care</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Account</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">Sign In</Link></li>
              <li><Link href="/register" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">Create Account</Link></li>
              <li><Link href="/cart" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">View Cart</Link></li>
              <li><Link href="/profile" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">My Orders</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Info</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">Contact Us</Link></li>
              <li><Link href="/complaints" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">Submit a Complaint</Link></li>
              <li><Link href="/faq" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">FAQ</Link></li>
              <li><Link href="/privacy" className="text-gray-600 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-rose-100 dark:border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 order-last sm:order-first">© {new Date().getFullYear()} Lumina. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300" aria-label="Accepted payment methods">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-rose-100 dark:border-gray-800"><Banknote size={12} aria-hidden="true" /> Cash on Delivery</span>
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-rose-100 dark:border-gray-800">JazzCash</span>
            <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-rose-100 dark:border-gray-800">EasyPaisa</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Made with ♥ in Pakistan 🇵🇰</p>
        </div>
      </div>
    </footer>
  );
}
