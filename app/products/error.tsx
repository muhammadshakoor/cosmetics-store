'use client';

export default function ProductsError({ reset }: { reset: () => void }) {
  return <div role="alert" className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="mb-3 text-2xl font-bold">Products are temporarily unavailable</h1><p className="mb-6 text-gray-600 dark:text-gray-400">Please try again in a moment.</p><button onClick={reset} className="rounded-xl bg-rose-600 px-6 py-3 font-semibold text-white">Try again</button></div>;
}
