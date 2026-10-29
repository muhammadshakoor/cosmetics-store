'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, Sparkles, CheckCircle2, ArrowRight, ShoppingBag, RefreshCw } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { API_URL } from '@/lib/api';
import type { ProductType } from '@/components/ProductCard';
import toast from 'react-hot-toast';

interface SkinQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUIZ_STEPS = [
  {
    title: 'What is your skin type?',
    subtitle: 'Select the option that best describes your skin on a typical day.',
    options: [
      { id: 'oily', label: 'Oily', desc: 'Shiny, enlarged pores, prone to breakouts', icon: '✨' },
      { id: 'dry', label: 'Dry', desc: 'Tight, flaky, dull, rough texture', icon: '💧' },
      { id: 'combo', label: 'Combination', desc: 'Oily T-zone, normal or dry cheeks', icon: '⚖️' },
      { id: 'sensitive', label: 'Sensitive', desc: 'Redness, easily irritated', icon: '🌸' },
      { id: 'normal', label: 'Normal', desc: 'Balanced, smooth, minimal concerns', icon: '🌿' },
    ],
  },
  {
    title: 'What is your main skin goal?',
    subtitle: 'Choose the result you care about most.',
    options: [
      { id: 'hydration', label: 'Hydration & Softness', desc: 'Dull, dehydrated skin that needs moisture', icon: '🌊' },
      { id: 'brightening', label: 'Brightening & Glow', desc: 'Uneven tone, pigmentation, dullness', icon: '🌟' },
      { id: 'acne', label: 'Clear Pores & Blemishes', desc: 'Breakouts, clogged pores, excess oil', icon: '🎯' },
      { id: 'antiaging', label: 'Firming & Renewal', desc: 'Fine lines, loss of firmness', icon: '⏳' },
    ],
  },
];

// Ingredient keywords matched against real product names in the catalog
const SKIN_KEYWORDS: Record<string, string[]> = {
  oily: ['charcoal', 'neem', 'spirulina', 'clay', 'toner'],
  dry: ['goat milk', 'honey', 'almond', 'lotion', 'moisturizer'],
  combo: ['aloe', 'clay', 'hibiscus', 'toner'],
  sensitive: ['aloe', 'goat milk', 'lavender', 'almond'],
  normal: ['manjistha', 'rose', 'sandalwood', 'serum'],
};
const GOAL_KEYWORDS: Record<string, string[]> = {
  hydration: ['moisturizer', 'goat milk', 'honey', 'lotion', 'almond'],
  brightening: ['vitamin c', 'turmeric', 'manjistha', 'glow'],
  acne: ['charcoal', 'neem', 'spirulina', 'aloe'],
  antiaging: ['serum', 'clay', 'firming', 'hibiscus', 'moisturizer'],
};
const ROUTINE_CATEGORIES = ['soaps', 'skincare', 'bodycare'];
const STEP_LABELS = ['Cleanse', 'Treat', 'Nourish'];

function buildRoutine(products: ProductType[], skinType: string, goal: string): ProductType[] {
  const score = (p: ProductType) => {
    const name = p.name.toLowerCase();
    const hits = (words: string[] = []) => words.filter((w) => name.includes(w)).length;
    return hits(SKIN_KEYWORDS[skinType]) * 2 + hits(GOAL_KEYWORDS[goal]) * 3 + p.rating / 10;
  };
  const ranked = products
    .filter((p) => p.countInStock > 0 && ROUTINE_CATEGORIES.includes(p.category?.toLowerCase()) && !/gift set|collection/i.test(p.name))
    .sort((a, b) => score(b) - score(a));

  // A cleansing bar, then a face/body treatment, then the next best match
  const picks: ProductType[] = [];
  const cleanser = ranked.find((p) => p.category.toLowerCase() === 'soaps');
  if (cleanser) picks.push(cleanser);
  const treatment = ranked.find((p) => p.category.toLowerCase() !== 'soaps');
  if (treatment) picks.push(treatment);
  for (const p of ranked) {
    if (picks.length >= 3) break;
    if (!picks.includes(p)) picks.push(p);
  }
  return picks;
}

export default function SkinQuizModal({ isOpen, onClose }: SkinQuizModalProps) {
  const { addToCart } = useCart();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [catalog, setCatalog] = useState<ProductType[] | null>(null);

  // Load the real catalog the first time the quiz opens
  useEffect(() => {
    if (!isOpen || catalog) return;
    fetch(`${API_URL}/products`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCatalog(Array.isArray(data) ? data : []))
      .catch(() => setCatalog([]));
  }, [isOpen, catalog]);

  // Escape closes; lock page scroll behind the dialog
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentStep = QUIZ_STEPS[stepIndex];

  const handleSelectOption = (optionId: string) => {
    setAnswers({ ...answers, [stepIndex]: optionId });
    if (stepIndex < QUIZ_STEPS.length - 1) setStepIndex(stepIndex + 1);
    else setIsCompleted(true);
  };

  const handleReset = () => {
    setStepIndex(0);
    setAnswers({});
    setIsCompleted(false);
  };

  const skinType = answers[0] || 'normal';
  const goal = answers[1] || 'brightening';
  const skinLabel = QUIZ_STEPS[0].options.find((o) => o.id === skinType)?.label || skinType;
  const goalLabel = QUIZ_STEPS[1].options.find((o) => o.id === goal)?.label || goal;
  const routine = isCompleted && catalog ? buildRoutine(catalog, skinType, goal) : [];
  const routineTotal = routine.reduce((sum, p) => sum + p.price, 0);

  const handleAddRoutineToCart = () => {
    routine.forEach((p) => {
      addToCart({ product: p._id, name: p.name, image: p.image, price: p.price, qty: 1, countInStock: p.countInStock });
    });
    toast.success('Your routine has been added to the cart!');
    onClose();
    handleReset();
  };

  // Portal to <body>: the navbar's backdrop-blur would otherwise trap this fixed overlay inside the header
  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-60 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-title"
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-xl max-h-[90dvh] flex flex-col overflow-hidden border border-rose-100 dark:border-gray-700"
      >
        {/* Modal Header */}
        <div className="bg-linear-to-r from-[#C2185B] to-pink-600 px-6 py-5 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close skin quiz"
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-amber-300" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-widest text-rose-100">Skin Routine Finder</span>
          </div>
          <h2 id="quiz-title" className="text-xl font-extrabold pr-8">Find Your Natural Skincare Routine</h2>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto">
          {!isCompleted ? (
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">
                <span>Question {stepIndex + 1} of {QUIZ_STEPS.length}</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-6" role="progressbar" aria-valuemin={1} aria-valuemax={QUIZ_STEPS.length} aria-valuenow={stepIndex + 1}>
                <div
                  className="h-full bg-[#C2185B] transition-all duration-300 rounded-full"
                  style={{ width: `${((stepIndex + 1) / QUIZ_STEPS.length) * 100}%` }}
                />
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{currentStep.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{currentStep.subtitle}</p>

              <div className="space-y-3">
                {currentStep.options.map((opt) => (
                  <button
                    type="button"
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${
                      answers[stepIndex] === opt.id
                        ? 'border-[#C2185B] bg-rose-50/60 dark:bg-rose-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-500 hover:bg-rose-50/50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl" aria-hidden="true">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#C2185B] dark:group-hover:text-rose-400 transition-colors">
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    <ArrowRight size={16} aria-hidden="true" className="text-gray-300 dark:text-gray-600 group-hover:text-[#C2185B] group-hover:translate-x-1 transition-all shrink-0" />
                  </button>
                ))}
              </div>

              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => setStepIndex(stepIndex - 1)}
                  className="mt-6 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  ← Back to previous question
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={26} className="text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Your Recommended Routine</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  For <span className="font-bold text-[#C2185B] dark:text-rose-400">{skinLabel.toLowerCase()}</span> skin · focus on <span className="font-bold text-[#C2185B] dark:text-rose-400">{goalLabel.toLowerCase()}</span>
                </p>
              </div>

              {!catalog ? (
                <div className="space-y-3 mb-6" aria-busy="true">
                  {[0, 1, 2].map((i) => <div key={i} className="h-18 rounded-2xl bg-gray-100 dark:bg-gray-700 animate-pulse" />)}
                </div>
              ) : routine.length === 0 ? (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-6">
                  We couldn&apos;t load recommendations right now.{' '}
                  <Link href="/products?category=skincare" onClick={onClose} className="font-semibold text-[#C2185B] dark:text-rose-400 hover:underline">Browse skincare</Link>
                </p>
              ) : (
                <>
                  <ol className="space-y-3 mb-6">
                    {routine.map((item, idx) => (
                      <li key={item._id}>
                        <Link
                          href={`/products/${item._id}`}
                          onClick={onClose}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-rose-200 dark:hover:border-rose-900 transition-colors"
                        >
                          <span className="w-6 h-6 rounded-full bg-[#C2185B] text-white text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                          <img src={item.image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 bg-white dark:bg-gray-800" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#C2185B] dark:text-rose-400">{STEP_LABELS[idx]}</p>
                            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 line-clamp-2">{item.name}</p>
                          </div>
                          <p className="text-xs font-bold text-gray-900 dark:text-gray-100 shrink-0">Rs. {Math.round(item.price).toLocaleString()}</p>
                        </Link>
                      </li>
                    ))}
                  </ol>

                  <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-4 mb-6 border border-rose-100 dark:border-rose-900/30 flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      First order? Use <span className="font-mono font-bold text-[#C2185B] dark:text-rose-400">LUMINA10</span> at checkout for 10% off.
                    </p>
                    <p className="text-lg font-black text-gray-900 dark:text-gray-100 shrink-0">Rs. {Math.round(routineTotal).toLocaleString()}</p>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={14} /> Retake
                </button>
                <button
                  type="button"
                  onClick={handleAddRoutineToCart}
                  disabled={routine.length === 0}
                  className="flex-1 py-3 bg-[#C2185B] hover:bg-[#A31555] text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-200 dark:shadow-none flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingBag size={14} />
                  Add Routine to Cart
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
