'use client';

import Link from 'next/link';
import { ShoppingBag, User, Search, LogOut, Menu, X, LayoutDashboard, Heart, BarChart2, MessageSquareWarning } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const { count: wishlistCount } = useWishlist();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const router = useRouter();
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/');
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-white shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md group-hover:shadow-rose-200 transition-shadow">
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <span className="text-xl font-bold bg-linear-to-r from-rose-600 to-pink-500 bg-clip-text text-transparent">
              Lumina
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-sm font-medium text-gray-600 hover:text-rose-500 transition-colors">Home</Link>
            <Link href="/products" className="text-sm font-medium text-gray-600 hover:text-rose-500 transition-colors">Shop</Link>
            <Link href="/products?category=skincare" className="text-sm font-medium text-gray-600 hover:text-rose-500 transition-colors">Skincare</Link>
            <Link href="/products?category=makeup" className="text-sm font-medium text-gray-600 hover:text-rose-500 transition-colors">Makeup</Link>
            <Link href="/products?category=jewelry" className="text-sm font-medium text-gray-600 hover:text-rose-500 transition-colors">Jewellery</Link>
          </nav>

          {/* Right: Search + Cart + User */}
          <div className="flex items-center gap-2">
            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-44 pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all focus:w-52"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500">
                  <Search size={14} />
                </button>
              </div>
            </form>

            {/* Wishlist */}
            <Link href="/wishlist" className="relative p-2 rounded-full hover:bg-rose-50 transition-colors group">
              <Heart size={20} className="text-gray-600 group-hover:text-rose-500 transition-colors" />
              {mounted && wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-white text-xs flex items-center justify-center font-bold shadow">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link href="/cart" className="relative p-2 rounded-full hover:bg-rose-50 transition-colors group">
              <ShoppingBag size={20} className="text-gray-600 group-hover:text-rose-500 transition-colors" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-white text-xs flex items-center justify-center font-bold shadow">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* User Menu — only render after mount to avoid hydration mismatch */}
            {!mounted ? (
              <div className="w-20 h-8" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 transition-colors"
                >
                  <User size={16} className="text-rose-600" />
                  <span className="text-sm font-medium text-rose-700 hidden sm:block">{user.name.split(' ')[0]}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50">
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <User size={14} /> My Profile
                    </Link>
                    {user.isAdmin && (
                      <>
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <LayoutDashboard size={14} /> Admin Panel
                        </Link>
                        <Link
                          href="/admin/dashboard"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <BarChart2 size={14} /> Sales Dashboard
                        </Link>
                      </>
                    )}
                    {!user.isAdmin && (
                      <>
                        <Link
                          href="/complaints/my"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <MessageSquareWarning size={14} /> My Complaints
                        </Link>
                        <Link
                          href="/complaints"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <MessageSquareWarning size={14} /> Submit Complaint
                        </Link>
                      </>
                    )}
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-full transition-colors shadow-sm"
              >
                <User size={14} />
                <span className="hidden sm:block">Sign in</span>
              </Link>
            )}

            {/* Hamburger (mobile only) */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1 pb-4">
            <Link href="/" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-rose-50 rounded-xl">Home</Link>
            <Link href="/products" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-rose-50 rounded-xl">Shop All</Link>
            <Link href="/products?category=skincare" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-rose-50 rounded-xl">Skincare</Link>
            <Link href="/products?category=makeup" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-rose-50 rounded-xl">Makeup</Link>
            <Link href="/products?category=jewelry" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-rose-50 rounded-xl">Jewellery</Link>
            <Link href="/products?category=fragrance" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-rose-50 rounded-xl">Fragrance</Link>
            <Link href="/products?category=haircare" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-rose-50 rounded-xl">Hair Care</Link>
            {user && (
              <>
                <div className="border-t border-gray-100 my-2" />
                <Link href="/profile" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-rose-50 rounded-xl">My Profile</Link>
                {user.isAdmin && (
                  <Link href="/admin" className="block px-3 py-2.5 text-sm text-gray-700 hover:bg-rose-50 rounded-xl">Admin Panel</Link>
                )}
              </>
            )}
            <div className="border-t border-gray-100 pt-3 px-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
                <button type="submit" className="px-4 py-2 bg-rose-500 text-white rounded-full text-sm font-medium">Go</button>
              </form>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
