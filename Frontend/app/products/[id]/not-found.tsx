import Link from 'next/link';

export default function ProductNotFound() {
  return <div className="px-4 py-20 text-center"><h1 className="mb-3 text-2xl font-bold">Product not found</h1><p className="mb-6 text-gray-600 dark:text-gray-400">This product may no longer be available.</p><Link href="/products" className="inline-block rounded-xl bg-rose-600 px-6 py-3 font-semibold text-white">Browse products</Link></div>;
}
