'use client';

import Link from 'next/link';
import { ShoppingBag, User, Search, LogOut, Menu, X, LayoutDashboard, Heart, BarChart2, MessageSquareWarning, ArrowRight, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import SkinQuizModal from '@/components/SkinQuizModal';
import { API_URL } from '@/lib/api';
import type { ProductType } from '@/components/ProductCard';

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

const NAV_LINKS = [
  { href: '/products?category=skincare', label: 'Skincare' },
  { href: '/products?category=soaps', label: 'Handmade Soaps' },
  { href: '/products?category=bodycare', label: 'Body Care' },
  { href: '/products?category=haircare', label: 'Hair Care' },
];

const MOBILE_LINK_CLS = 'block px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl';

export default function Navbar() {
  const { itemCount } = useCart();
  const { user, logout } = useAuth();
  const { count: wishlistCount } = useWishlist();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductType[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const router = useRouter();
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setShowSuggestions(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_URL}/products?keyword=${encodeURIComponent(searchQuery.trim())}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(Array.isArray(data) ? data : []);
          setShowSuggestions(true);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setUserMenuOpen(false);
      setShowSuggestions(false);
      setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e?: { preventDefault(): void }) => {
    if (e) e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
      setSearchQuery('');
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    setMobileOpen(false);
    router.push('/');
  };

  const desktopLinkCls = (active: boolean) =>
    `text-sm font-medium transition-colors whitespace-nowrap ${
      active
        ? 'text-[#C2185B] dark:text-rose-400'
        : 'text-gray-600 dark:text-gray-300 hover:text-rose-500 dark:hover:text-rose-400'
    }`;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-md dark:shadow-gray-900'
          : 'bg-white dark:bg-gray-900 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">

        {/* Main row: Logo | Nav | Icons */}
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md group-hover:shadow-rose-200 transition-shadow">
              <span className="text-white text-xs font-bold">L</span>
            </div>
            <span className="hidden sm:inline text-xl font-bold bg-linear-to-r from-rose-600 to-pink-500 bg-clip-text text-transparent leading-tight">
              Lumina
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav aria-label="Main" className="hidden lg:flex items-center gap-6">
            <Link href="/" aria-current={pathname === '/' ? 'page' : undefined} className={desktopLinkCls(pathname === '/')}>Home</Link>
            <Link href="/products" aria-current={pathname === '/products' ? 'page' : undefined} className={desktopLinkCls(pathname === '/products')}>Shop</Link>
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={desktopLinkCls(false)}>{label}</Link>
            ))}
            <button
              type="button"
              onClick={() => setQuizOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-linear-to-r from-rose-500 to-pink-600 text-white text-xs font-bold rounded-full shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Sparkles size={12} className="text-amber-300" aria-hidden="true" /> Skin Quiz
            </button>
          </nav>

          {/* Right icons */}
          <div className="flex items-center gap-0.5 sm:gap-2">
            <ThemeToggle />

            {/* Wishlist */}
            <Link
              href="/wishlist"
              aria-label={mounted && wishlistCount > 0 ? `Wishlist, ${wishlistCount} items` : 'Wishlist'}
              className="relative p-1.5 sm:p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors group">
              <Heart size={20} aria-hidden="true" className="text-gray-600 dark:text-gray-300 group-hover:text-rose-500 transition-colors" />
              {mounted && wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-rose-500 rounded-full text-white text-[10px] sm:text-xs flex items-center justify-center font-bold shadow">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : 'Cart'}
              className="relative p-1.5 sm:p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors group">
              <ShoppingBag size={20} aria-hidden="true" className="text-gray-600 dark:text-gray-300 group-hover:text-rose-500 transition-colors" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-rose-500 rounded-full text-white text-[10px] sm:text-xs flex items-center justify-center font-bold shadow">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {!mounted ? (
              <div className="w-9 h-9 rounded-full" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="Account menu"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                  className="flex items-center gap-2 p-1.5 sm:pr-3 rounded-full bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                >
                  <UserAvatar name={user.name} picture={user.picture} />
                  <span className="text-sm font-semibold text-rose-700 dark:text-rose-300 hidden sm:block max-w-20 truncate">{user.name.split(' ')[0]}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50">
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
                aria-label="Sign in"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-full transition-colors shadow-sm"
              >
                <User size={14} />
                <span className="hidden sm:block">Sign in</span>
              </Link>
            )}

            {/* Hamburger */}
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} className="text-gray-700 dark:text-gray-200" /> : <Menu size={20} className="text-gray-700 dark:text-gray-200" />}
            </button>
          </div>
        </div>

        {/* Persistent Search Bar with Live Autocomplete */}
        <div className="border-t border-gray-100 dark:border-gray-700 py-2 relative" ref={searchContainerRef}>
          <form onSubmit={handleSearch} className="relative">
            <Search size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              aria-label="Search products"
              autoComplete="off"
              placeholder="Search soaps, skincare, body care..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              className="w-full pl-10 pr-14 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent focus:bg-white dark:focus:bg-gray-700 transition-all"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors flex items-center justify-center"
            >
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Autocomplete Dropdown Overlay */}
          {showSuggestions && searchQuery.trim().length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
              {isSearching ? (
                <div className="p-4 text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  Searching products...
                </div>
              ) : suggestions.length > 0 ? (
                <div className="py-2">
                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Suggested Products
                  </div>
                  {suggestions.map((item) => (
                    <Link
                      key={item._id}
                      href={`/products/${item._id}`}
                      onClick={() => { setShowSuggestions(false); setSearchQuery(''); }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-rose-50 dark:hover:bg-gray-700/60 transition-colors"
                    >
                      <img src={item.image || `https://picsum.photos/seed/${item._id}/80/80`} alt={item.name} className="w-9 h-9 rounded-xl object-cover shrink-0 bg-gray-100 dark:bg-gray-700" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">{item.category} · {item.brand}</p>
                      </div>
                      <span className="text-xs font-bold text-[#C2185B]">Rs. {Math.round(item.price).toLocaleString()}</span>
                    </Link>
                  ))}
                  <button
                    onClick={() => handleSearch()}
                    className="w-full text-center py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 border-t border-gray-100 dark:border-gray-700 transition-colors"
                  >
                    View all results for &ldquo;{searchQuery}&rdquo; →
                  </button>
                </div>
              ) : (
                <div className="p-4 text-xs text-gray-400 dark:text-gray-500 text-center">
                  No products found matching &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile Nav Drawer */}
        {mobileOpen && (
          <nav
            id="mobile-menu"
            aria-label="Mobile"
            // Close on any link tap — query-only navigations (e.g. ?category=) don't change the pathname
            onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setMobileOpen(false); }}
            className="lg:hidden border-t border-gray-100 dark:border-gray-700 py-3 space-y-1 pb-4 max-h-[calc(100dvh-116px)] overflow-y-auto">
            <Link href="/" className={MOBILE_LINK_CLS}>Home</Link>
            <Link href="/products" className={MOBILE_LINK_CLS}>Shop All</Link>
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className={MOBILE_LINK_CLS}>{label}</Link>
            ))}
            <Link href="/products?category=fragrance" className={MOBILE_LINK_CLS}>Fragrance</Link>
            <button
              type="button"
              onClick={() => { setMobileOpen(false); setQuizOpen(true); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-[#C2185B] dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"
            >
              <Sparkles size={14} aria-hidden="true" /> Take the Skin Quiz
            </button>
            <div className="border-t border-gray-100 dark:border-gray-700 my-2" />
            {mounted && user ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2">
                  <UserAvatar name={user.name} picture={user.picture} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
                <Link href="/profile" className={MOBILE_LINK_CLS}>My Profile &amp; Orders</Link>
                <Link href="/wishlist" className={MOBILE_LINK_CLS}>Wishlist</Link>
                {user.isAdmin ? (
                  <>
                    <Link href="/admin" className={MOBILE_LINK_CLS}>Admin Panel</Link>
                    <Link href="/admin/dashboard" className={MOBILE_LINK_CLS}>Sales Dashboard</Link>
                  </>
                ) : (
                  <Link href="/complaints/my" className={MOBILE_LINK_CLS}>My Complaints</Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                >
                  <LogOut size={14} aria-hidden="true" /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={MOBILE_LINK_CLS}>Sign in</Link>
                <Link href="/register" className={MOBILE_LINK_CLS}>Create account</Link>
              </>
            )}
          </nav>
        )}
      </div>

      <SkinQuizModal isOpen={quizOpen} onClose={() => setQuizOpen(false)} />
    </header>
  );
}
