'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Filter, Search, X, ChevronDown } from 'lucide-react';
import ProductCard, { type ProductType } from '@/components/ProductCard';
import { API_URL } from '@/lib/api';

type SortKey = 'newest' | 'price_asc' | 'price_desc' | 'rating';

const CATEGORIES = [
  { label: 'All', value: '' }, { label: 'Skincare', value: 'skincare' },
  { label: 'Handmade Soaps', value: 'soaps' }, { label: 'Body Care', value: 'bodycare' },
  { label: 'Hair Care', value: 'haircare' }, { label: 'Fragrance', value: 'fragrance' },
  { label: 'Makeup', value: 'makeup' },
];
const inputClass = 'rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

function ProductSkeletons() {
  return <div aria-label="Loading products" role="status" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-80 animate-pulse rounded-3xl bg-white dark:bg-gray-800" />)}</div>;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const search = searchParams.get('search') || '';
  const category = (searchParams.get('category') || '').toLowerCase();
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('min') || '';
  const maxPrice = searchParams.get('max') || '';
  const [result, setResult] = useState<{ key: string; products: ProductType[]; error: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const requestKey = JSON.stringify([search, category, retry]);
  const loading = result?.key !== requestKey;
  const error = loading ? '' : result?.error;

  function updateFilters(values: Record<string, string>, replace = false) {
    // Read the current URL so quick successive edits cannot overwrite each other.
    const params = new URLSearchParams(window.location.search);
    Object.entries(values).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
    const url = `/products${params.size ? `?${params}` : ''}`;
    if (replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('keyword', search.trim());
        if (category && category !== 'all') params.set('category', category);
        const response = await fetch(`${API_URL}/products?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error('We could not load products. Please try again.');
        const products: ProductType[] = await response.json();
        if (!Array.isArray(products)) throw new Error('We could not load products. Please try again.');
        if (!controller.signal.aborted) setResult({ key: requestKey, products, error: '' });
      } catch (cause) {
        if (!controller.signal.aborted) setResult({ key: requestKey, products: [], error: cause instanceof Error ? cause.message : 'Could not load products.' });
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search, category, requestKey]);

  const invalidRange = minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice);
  const products = (result?.products || []).filter((product) => {
    if (minPrice !== '' && product.price < Math.max(0, Number(minPrice))) return false;
    if (maxPrice !== '' && product.price > Math.max(0, Number(maxPrice))) return false;
    return true;
  }).sort((a, b) => {
    if (sort === 'price_asc') return a.price - b.price;
    if (sort === 'price_desc') return b.price - a.price;
    if (sort === 'rating') return b.rating - a.rating;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-1 text-3xl font-extrabold text-gray-900 dark:text-gray-100 sm:text-4xl">All Products</h1>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">Find your next everyday favorite.</p>
        <div className="mb-6 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <label htmlFor="product-search" className="sr-only">Search products</label>
            <Search aria-hidden="true" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input id="product-search" type="search" placeholder="Search products..." value={search} onChange={(event) => updateFilters({ search: event.target.value }, true)} className={`${inputClass} w-full pl-10 pr-10`} />
            {search && <button aria-label="Clear search" onClick={() => updateFilters({ search: '' }, true)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500"><X size={16} /></button>}
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <label htmlFor="product-sort" className="sr-only">Sort products</label>
              <select id="product-sort" value={sort} onChange={(event) => updateFilters({ sort: event.target.value })} className={`${inputClass} w-full appearance-none pr-10`}>
                <option value="newest">Newest</option><option value="price_asc">Price: Low to High</option><option value="price_desc">Price: High to Low</option><option value="rating">Top Rated</option>
              </select>
              <ChevronDown aria-hidden="true" size={14} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500" />
            </div>
            <button aria-expanded={showFilters} aria-controls="price-filters" onClick={() => setShowFilters(!showFilters)} className={`${inputClass} flex items-center gap-2 md:hidden`}><Filter size={14} /> Filters</button>
          </div>
        </div>
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div aria-label="Product categories" className="flex flex-wrap gap-2">
            {CATEGORIES.map((item) => <button key={item.value} aria-pressed={category === item.value || (!item.value && category === 'all')} onClick={() => updateFilters({ category: item.value })} className={`rounded-full border px-4 py-2 text-xs font-semibold ${category === item.value || (!item.value && category === 'all') ? 'border-rose-600 bg-rose-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-rose-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}>{item.label}</button>)}
          </div>
          <div id="price-filters" className={`items-center gap-2 ${showFilters ? 'flex' : 'hidden md:flex'}`}>
            <label htmlFor="min-price" className="sr-only">Minimum price in rupees</label>
            <input id="min-price" type="number" min="0" placeholder="Min Rs." value={minPrice} onChange={(event) => updateFilters({ min: event.target.value }, true)} className={`${inputClass} w-28 px-3`} />
            <span aria-hidden="true">–</span>
            <label htmlFor="max-price" className="sr-only">Maximum price in rupees</label>
            <input id="max-price" type="number" min="0" placeholder="Max Rs." value={maxPrice} onChange={(event) => updateFilters({ max: event.target.value }, true)} className={`${inputClass} w-28 px-3`} />
          </div>
        </div>
        {invalidRange && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">Minimum price must be less than or equal to maximum price.</p>}
        <div aria-live="polite" aria-busy={loading}>
          {loading ? <ProductSkeletons /> : error ? <div role="alert" className="rounded-2xl border border-red-200 p-8 text-center dark:border-red-900"><p className="mb-4">{error}</p><button onClick={() => setRetry((value) => value + 1)} className="rounded-xl bg-rose-600 px-5 py-3 font-semibold text-white">Retry loading products</button></div> : <>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">{products.length} product{products.length === 1 ? '' : 's'} found{search ? ` for “${search}”` : ''}</p>
            {products.length === 0 ? <div className="py-16 text-center"><h2 className="mb-2 text-lg font-bold">No products found</h2><p className="text-sm text-gray-600 dark:text-gray-400">Try a different search or clear your filters.</p><button onClick={() => window.history.pushState(null, '', '/products')} className="mt-5 rounded-xl bg-rose-600 px-5 py-3 font-semibold text-white">Clear all filters</button></div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div>}
          </>}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return <Suspense fallback={<div className="min-h-screen bg-gray-50 p-8 dark:bg-gray-950"><ProductSkeletons /></div>}><ProductsContent /></Suspense>;
}
