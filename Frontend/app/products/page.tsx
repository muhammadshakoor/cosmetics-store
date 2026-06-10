'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filter, Search, X } from 'lucide-react';
import ProductCard, { type ProductType } from '@/components/ProductCard';
import { API_URL } from '@/lib/api';

const CATEGORIES = ['All', 'Skincare', 'Makeup', 'Fragrance', 'Hair Care', 'Jewelry'];

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || 'All');
  const [showFilters, setShowFilters] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('keyword', search);
      if (activeCategory !== 'All') params.set('category', activeCategory.toLowerCase());

      const res = await fetch(`${API_URL}/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, activeCategory]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">All Products</h1>
          <p className="text-gray-500">Discover our full range of premium cosmetics</p>
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-white rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm shadow-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-600 hover:border-rose-300 hover:text-rose-600 transition-colors shadow-sm sm:hidden"
          >
            <Filter size={14} /> Filters
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-rose-300 hover:text-rose-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results Summary */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-6">
            {products.length} product{products.length !== 1 ? 's' : ''} found
            {activeCategory !== 'All' && ` in "${activeCategory}"`}
            {search && ` for "${search}"`}
          </p>
        )}

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl h-80 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No products found</h3>
            <p className="text-gray-400">Try adjusting your search or filter criteria</p>
            <button
              onClick={() => { setSearch(''); setActiveCategory('All'); }}
              className="mt-6 px-6 py-2 bg-rose-500 text-white rounded-2xl text-sm font-medium hover:bg-rose-600 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
