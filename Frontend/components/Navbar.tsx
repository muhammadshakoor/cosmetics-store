'use client';

import Link from 'next/link';
import { ShoppingBag, User, Search, LogOut, Menu, X, LayoutDashboard, Heart, BarChart2, MessageSquareWarning } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

const AVATAR_GRADIENTS = [
  'from-rose-400 to-pink-600',
  'from-violet-400 to-purple-600',
  'from-blue-400 to-indigo-600',
  'from-teal-400 to-emerald-600',
  'from-amber-400 to-orange-500',
  'from-fuchsia-400 to-rose-500',
  'from-sky-400 to-blue-600',
  'from-green-400 to-teal-600',
];

function UserAvatar({ name, picture, size = 'sm' }: { name: string; picture?: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const gradient = AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
  const sz = size === 'md' ? 'w-10 h-10 text-sm' : 'w-7 h-7 text-xs';

  if (picture) {
    return (
      <img
        src={picture}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${sz} rounded-full object-cover shrink-0 shadow-sm ring-2 ring-white/30`}
      />
    );
  }

  return (
    <div className={`${sz} bg-linear-to-br ${gradient} rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-sm select-none leading-none`}>
      {initials}
    </div>
  );
}

export default function Navbar() {
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const { count: wishlistCount } = useWishlist();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);
  const router = useRouter();
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  // Auto-focus mobile search input when opened
  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileSearchRef.current?.focus(), 50);
    }
  }, [mobileSearchOpen]);

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
      setMobileSearchOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push('/');
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-md dark:shadow-gray-900'
          : 'bg-white dark:bg-gray-900 shadow-sm'
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
            <Link href="/" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">Home</Link>
            <Link href="/products" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">Shop</Link>
            <Link href="/products?category=skincare" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">Skincare</Link>
            <Link href="/products?category=makeup" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">Makeup</Link>
            <Link href="/products?category=jewelry" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">Jewellery</Link>
          </nav>

          {/* Right icons — order: Search(desktop) | Theme | Wishlist | Cart | Search(mobile) | Profile | Hamburger */}
          <div className="flex items-center gap-0.5 sm:gap-2">
            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="hidden sm:flex items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-56 pl-3 pr-8 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent transition-all focus:w-72"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500">
                  <Search size={14} />
                </button>
              </div>
            </form>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Wishlist */}
            <Link href="/wishlist" className="relative p-1.5 sm:p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors group">
              <Heart size={20} className="text-gray-600 dark:text-gray-300 group-hover:text-rose-500 transition-colors" />
              {mounted && wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-rose-500 rounded-full text-white text-[10px] sm:text-xs flex items-center justify-center font-bold shadow">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link href="/cart" className="relative p-1.5 sm:p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors group">
              <ShoppingBag size={20} className="text-gray-600 dark:text-gray-300 group-hover:text-rose-500 transition-colors" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-rose-500 rounded-full text-white text-[10px] sm:text-xs flex items-center justify-center font-bold shadow">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* Mobile Search — BEFORE profile */}
            <button
              className="sm:hidden p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => { setMobileSearchOpen(!mobileSearchOpen); setMobileOpen(false); }}
              aria-label="Search"
            >
              <Search size={20} className="text-gray-600 dark:text-gray-300" />
            </button>

            {/* User Menu — AFTER search, BEFORE hamburger */}
            {!mounted ? (
              <div className="w-9 h-9 rounded-full" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 sm:pr-3 rounded-full bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                >
                  <UserAvatar name={user.name} picture={user.picture} />
                  <span className="text-sm font-semibold text-rose-700 dark:text-rose-300 hidden sm:block max-w-20 truncate">{user.name.split(' ')[0]}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50">
                    {/* Profile header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <UserAvatar name={user.name} picture={user.picture} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    >
                      <User size={14} /> My Profile
                    </Link>
                    {user.isAdmin && (
                      <>
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        >
                          <LayoutDashboard size={14} /> Admin Panel
                        </Link>
                        <Link
                          href="/admin/dashboard"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        >
                          <BarChart2 size={14} /> Sales Dashboard
                        </Link>
                      </>
                    )}
                    {!user.isAdmin && (
                      <>
                        <Link
                          href="/complaints/my"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        >
                          <MessageSquareWarning size={14} /> My Complaints
                        </Link>
                        <Link
                          href="/complaints"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        >
                          <MessageSquareWarning size={14} /> Submit Complaint
                        </Link>
                      </>
                    )}
                    <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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

            {/* Hamburger — last on mobile */}
            <button
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => { setMobileOpen(!mobileOpen); setMobileSearchOpen(false); }}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} className="text-gray-700 dark:text-gray-200" /> : <Menu size={20} className="text-gray-700 dark:text-gray-200" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="sm:hidden border-t border-gray-100 dark:border-gray-700 px-4 py-3">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={mobileSearchRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold rounded-2xl transition-colors shrink-0"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </form>
          </div>
        )}

        {/* Mobile Nav Drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-700 py-3 space-y-1 pb-4">
            <Link href="/" className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">Home</Link>
            <Link href="/products" className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">Shop All</Link>
            <Link href="/products?category=skincare" className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">Skincare</Link>
            <Link href="/products?category=makeup" className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">Makeup</Link>
            <Link href="/products?category=jewelry" className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">Jewellery</Link>
            <Link href="/products?category=fragrance" className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">Fragrance</Link>
            <Link href="/products?category=haircare" className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">Hair Care</Link>
            {user && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
                <div className="flex items-center gap-3 px-3 py-2">
                  <UserAvatar name={user.name} picture={user.picture} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <Link href="/profile" className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">My Profile</Link>
                {user.isAdmin && (
                  <Link href="/admin" className="block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">Admin Panel</Link>
                )}
              </>
            )}
            <div className="border-t border-gray-100 dark:border-gray-700 pt-3 px-3">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300"
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
