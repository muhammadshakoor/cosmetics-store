import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">L</span>
              </div>
              <span className="text-xl font-bold text-white">Lumina</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Premium cosmetics for every skin type. Cruelty-free, sustainably sourced.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold text-white mb-4">Shop</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="hover:text-rose-400 transition-colors">All Products</Link></li>
              <li><Link href="/products?category=skincare" className="hover:text-rose-400 transition-colors">Skincare</Link></li>
              <li><Link href="/products?category=makeup" className="hover:text-rose-400 transition-colors">Makeup</Link></li>
              <li><Link href="/products?category=fragrance" className="hover:text-rose-400 transition-colors">Fragrance</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold text-white mb-4">Account</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/login" className="hover:text-rose-400 transition-colors">Sign In</Link></li>
              <li><Link href="/register" className="hover:text-rose-400 transition-colors">Create Account</Link></li>
              <li><Link href="/cart" className="hover:text-rose-400 transition-colors">View Cart</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-semibold text-white mb-4">Info</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-rose-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-rose-400 transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-rose-400 transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">© {new Date().getFullYear()} Lumina. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Made with ♥ using Next.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
