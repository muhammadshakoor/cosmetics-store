'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { X, Sparkles, ArrowRight, ShoppingBag, RefreshCw } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';
import ProductImage from './ProductImage';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import type { Product } from '@/types/api';
import toast from 'react-hot-toast';

const QUESTIONS = [
  { title: 'How would you describe your skin?', options: [
    { id: 'oily', label: 'Oily', description: 'Often shiny' }, { id: 'dry', label: 'Dry', description: 'Often feels tight or dry' },
    { id: 'combo', label: 'Combination', description: 'A mix of oily and dry areas' }, { id: 'sensitive', label: 'Sensitive', description: 'Easily irritated' },
    { id: 'normal', label: 'Balanced', description: 'Usually comfortable' },
  ] },
  { title: 'What would you like to focus on?', options: [
    { id: 'hydration', label: 'Moisture', description: 'Hydration and comfort' }, { id: 'brightening', label: 'Radiance', description: 'A brighter-looking complexion' },
    { id: 'acne', label: 'Cleansing', description: 'Oil and pore care' }, { id: 'antiaging', label: 'Texture', description: 'Smoothness and suppleness' },
  ] },
  { title: 'Which texture do you prefer?', options: [
    { id: 'gel', label: 'Lightweight', description: 'Gel, fluid, or toner' }, { id: 'cream', label: 'Rich', description: 'Cream, lotion, or balm' },
    { id: 'serum', label: 'Serum', description: 'A concentrated liquid texture' },
  ] },
];

const SKIN_TERMS: Record<string, string[]> = {
  oily: ['oil control', 'charcoal', 'clarifying', 'neem', 'niacinamide'], dry: ['moistur', 'hydrat', 'nourish', 'coconut', 'milk'],
  combo: ['balance', 'gentle', 'aloe', 'niacinamide'], sensitive: ['gentle', 'sooth', 'sensitive', 'aloe'], normal: ['daily', 'gentle', 'hydrat'],
};
const GOAL_TERMS: Record<string, string[]> = {
  hydration: ['hydrat', 'moistur', 'nourish', 'hyaluronic'], brightening: ['radiance', 'glow', 'brighten', 'vitamin c', 'turmeric'],
  acne: ['charcoal', 'cleanser', 'neem', 'clarifying', 'pores'], antiaging: ['smooth', 'firm', 'supple', 'peptide'],
};
const TEXTURE_TERMS: Record<string, string[]> = { gel: ['gel', 'fluid', 'toner', 'lightweight'], cream: ['cream', 'lotion', 'balm', 'butter'], serum: ['serum', 'essence'] };

function rankProducts(products: Product[], answers: Record<number, string>) {
  const groups = [{ terms: SKIN_TERMS[answers[0]] || [], weight: 3 }, { terms: GOAL_TERMS[answers[1]] || [], weight: 4 }, { terms: TEXTURE_TERMS[answers[2]] || [], weight: 2 }];
  return products.filter((product) => product.countInStock > 0 && ['skincare', 'soaps', 'bodycare'].includes(product.category.toLowerCase()))
    .map((product) => { const text = `${product.name} ${product.description}`.toLowerCase(); return { product, score: groups.reduce((sum, group) => sum + group.terms.filter((term) => text.includes(term)).length * group.weight, 0) }; })
    .sort((a, b) => b.score - a.score || b.product.rating - a.product.rating || a.product.name.localeCompare(b.product.name))
    .slice(0, 3);
}

export default function SkinQuizModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const titleId = useId();
  const questionId = useId();
  const { addToCart, cartItems } = useCart();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [completed, setCompleted] = useState(false);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ products: Product[]; error: string; attempt: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    fetch('/api/products', { signal: controller.signal })
      .then(async (response) => { if (!response.ok) throw new Error('The catalog could not be loaded.'); return response.json(); })
      .then((products: Product[]) => { if (!Array.isArray(products)) throw new Error('The catalog could not be loaded.'); if (!controller.signal.aborted) setResult({ products, error: '', attempt: retry }); })
      .catch(() => { if (!controller.signal.aborted) setResult({ products: [], error: 'We could not load available products. Please try again.', attempt: retry }); });
    return () => controller.abort();
  }, [isOpen, retry]);

  function reset() { setStep(0); setAnswers({}); setCompleted(false); }
  function close() { onClose(); reset(); }
  function select(option: string) {
    setAnswers((previous) => ({ ...previous, [step]: option }));
    if (step < QUESTIONS.length - 1) setStep(step + 1);
    else setCompleted(true);
  }
  const loading = !result || result.attempt !== retry;
  const recommendations = rankProducts(result?.products || [], answers);
  const total = recommendations.reduce((sum, item) => sum + item.product.price, 0);

  function addRecommendations() {
    if (user?.isAdmin) { toast.error('Use a customer account to shop.'); return; }
    const available = recommendations.filter(({ product }) => (cartItems.find((item) => item.product === product._id)?.qty || 0) < product.countInStock);
    if (available.length === 0) { toast.error('These products are already at their stock limit in your cart.'); return; }
    available.forEach(({ product }) => addToCart({ product: product._id, name: product.name, image: product.image, price: product.price, qty: 1, countInStock: product.countInStock }));
    toast.success(`${available.length} product${available.length === 1 ? '' : 's'} added at current catalog prices`);
    close();
  }

  return <AccessibleDialog isOpen={isOpen} onClose={close} labelledBy={titleId} className="max-w-xl">
    <div className="relative bg-rose-700 px-6 py-5 pr-14 text-white"><div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-widest"><Sparkles aria-hidden="true" size={17} /> Product Finder</div><h2 id={titleId} className="text-xl font-extrabold">Explore skincare for your preferences</h2><button aria-label="Close product finder" onClick={close} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 hover:bg-white/20"><X size={18} /></button></div>
    <div className="p-6">
      {!completed ? <section aria-labelledby={questionId}>
        <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">Question {step + 1} of {QUESTIONS.length}</p>
        <progress aria-label="Quiz progress" value={step + 1} max={QUESTIONS.length} className="mb-6 h-2 w-full accent-rose-600" />
        <h3 id={questionId} aria-live="polite" className="mb-5 text-lg font-bold">{QUESTIONS[step].title}</h3>
        <div className="space-y-3">{QUESTIONS[step].options.map((option) => <button key={option.id} onClick={() => select(option.id)} className="flex w-full items-center justify-between rounded-2xl border border-gray-300 p-4 text-left hover:border-rose-500 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-500 dark:border-gray-600 dark:hover:bg-gray-700"><span><span className="block text-sm font-bold">{option.label}</span><span className="mt-1 block text-xs text-gray-600 dark:text-gray-400">{option.description}</span></span><ArrowRight aria-hidden="true" size={16} /></button>)}</div>
        {step > 0 && <button onClick={() => setStep(step - 1)} className="mt-5 text-sm font-semibold text-rose-700 dark:text-rose-400">Back to previous question</button>}
      </section> : <section aria-label="Product suggestions" aria-live="polite">
        <h3 className="mb-2 text-xl font-bold">Products to explore</h3>
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">Suggestions match your skin, focus, and texture preferences against catalog descriptions. Check each product&apos;s details before choosing.</p>
        {loading ? <p role="status" className="py-8 text-center">Loading available products…</p> : result?.error ? <div role="alert"><p className="mb-4 text-sm">{result.error}</p><button onClick={() => setRetry((attempt) => attempt + 1)} className="rounded-xl bg-rose-700 px-4 py-2 font-semibold text-white">Retry loading products</button></div> : recommendations.length === 0 ? <p className="py-6 text-sm">No skincare, soap, or body care products are currently available. <Link href="/products" onClick={close} className="font-semibold text-rose-700 underline dark:text-rose-400">Browse the catalog</Link></p> : <>
          <div className="mb-5 space-y-3">{recommendations.map(({ product, score }) => <Link key={product._id} href={`/products/${product._id}`} onClick={close} className="flex items-center gap-3 rounded-2xl border border-gray-200 p-3 hover:border-rose-400 dark:border-gray-700"><span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"><ProductImage src={product.image} alt={product.name} sizes="56px" className="object-cover" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{product.name}</span><span className="mt-1 block text-xs text-gray-600 dark:text-gray-400">{score > 0 ? 'Matches your preferences' : 'Available to explore'}</span></span><span className="shrink-0 text-sm font-bold text-rose-700 dark:text-rose-400">Rs. {product.price.toLocaleString('en-PK')}</span></Link>)}</div>
          <p className="mb-5 flex justify-between rounded-2xl bg-rose-50 p-4 text-sm dark:bg-rose-950/30"><span>Products total</span><strong>Rs. {total.toLocaleString('en-PK')}</strong></p>
          <button onClick={addRecommendations} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-700 px-4 py-3 text-sm font-bold text-white hover:bg-rose-800"><ShoppingBag size={17} /> Add {recommendations.length} products to cart</button>
        </>}
        <button onClick={reset} className="mt-5 flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-400"><RefreshCw size={15} /> Retake quiz</button>
      </section>}
    </div>
  </AccessibleDialog>;
}
