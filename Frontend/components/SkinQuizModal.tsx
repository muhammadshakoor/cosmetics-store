'use client';

import { useState } from 'react';
import { X, Sparkles, CheckCircle2, ArrowRight, ShoppingBag, RefreshCw } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';

interface SkinQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUIZ_STEPS = [
  {
    title: 'What is your primary skin type?',
    subtitle: 'Select the option that best describes your skin on a typical day.',
    options: [
      { id: 'oily', label: 'Oily', desc: 'Shiny, enlarged pores, prone to breakouts', icon: '✨' },
      { id: 'dry', label: 'Dry', desc: 'Tight, flaky, dull, rough texture', icon: '💧' },
      { id: 'combo', label: 'Combination', desc: 'Oily T-zone, normal or dry cheeks', icon: '⚖️' },
      { id: 'sensitive', label: 'Sensitive', desc: 'Redness, easily irritated, stingy', icon: '🌸' },
      { id: 'normal', label: 'Normal', desc: 'Balanced, smooth, minimal concerns', icon: '🌿' },
    ],
  },
  {
    title: 'What is your main skincare goal?',
    subtitle: 'Choose your top target focus for visible improvements.',
    options: [
      { id: 'hydration', label: 'Deep Hydration & Plumping', desc: 'Dehydrated, dull skin needing intense moisture', icon: '🌊' },
      { id: 'brightening', label: 'Brightening & Glow', desc: 'Uneven skin tone, hyperpigmentation, sun spots', icon: '🌟' },
      { id: 'acne', label: 'Blemish & Pore Control', desc: 'Active breakouts, clogged pores, excess sebum', icon: '🎯' },
      { id: 'antiaging', label: 'Anti-Aging & Firming', desc: 'Fine lines, loss of elasticity, dullness', icon: '⏳' },
    ],
  },
  {
    title: 'What formula texture do you prefer?',
    subtitle: 'Select your ideal everyday product feel.',
    options: [
      { id: 'gel', label: 'Lightweight Gel / Fluid', desc: 'Quick absorbing, non-greasy, refreshing', icon: '🧊' },
      { id: 'cream', label: 'Rich Nourishing Cream', desc: 'Deep moisture barrier protection', icon: '🧈' },
      { id: 'serum', label: 'Potent Active Serum', desc: 'High concentration fast-acting formulas', icon: '🧴' },
    ],
  },
];

const ROUTINE_PRESETS: Record<string, { name: string; brand: string; price: number; image: string; id: string }[]> = {
  oily: [
    { id: 'sk-1', name: 'Hydra-Boost Niacinamide Gel Moisturizer', brand: 'Lumina Skin', price: 1850, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&auto=format' },
    { id: 'sk-2', name: 'Salicylic Clarifying Foam Cleanser', brand: 'Lumina Skin', price: 1450, image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop&auto=format' },
    { id: 'sk-3', name: 'Pore Minimizing Zinc Serum 30ml', brand: 'Lumina Skin', price: 2100, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop&auto=format' },
  ],
  dry: [
    { id: 'sk-4', name: 'Rose Petal Deep Glow Serum', brand: 'Lumina Botanicals', price: 2450, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop&auto=format' },
    { id: 'sk-5', name: 'Ceramide Barrier Repair Moisture Balm', brand: 'Lumina Botanicals', price: 2200, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&auto=format' },
    { id: 'sk-6', name: 'Gentle Milk Nourishing Cleanser', brand: 'Lumina Botanicals', price: 1600, image: 'https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=400&h=400&fit=crop&auto=format' },
  ],
  default: [
    { id: 'sk-7', name: 'Vitamin C Radiance Glow Essence', brand: 'Lumina Skin', price: 2250, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=400&fit=crop&auto=format' },
    { id: 'sk-8', name: 'Daily Defense Peptide Cream', brand: 'Lumina Skin', price: 1950, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&auto=format' },
    { id: 'sk-9', name: 'Gentle Foaming Hydrating Wash', brand: 'Lumina Skin', price: 1350, image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=400&fit=crop&auto=format' },
  ],
};

export default function SkinQuizModal({ isOpen, onClose }: SkinQuizModalProps) {
  const { addToCart } = useCart();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [addingBundle, setAddingBundle] = useState(false);

  if (!isOpen) return null;

  const currentStep = QUIZ_STEPS[stepIndex];

  const handleSelectOption = (optionId: string) => {
    const updated = { ...answers, [stepIndex]: optionId };
    setAnswers(updated);

    if (stepIndex < QUIZ_STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleReset = () => {
    setStepIndex(0);
    setAnswers({});
    setIsCompleted(false);
  };

  const selectedSkinType = answers[0] || 'default';
  const routine = ROUTINE_PRESETS[selectedSkinType] || ROUTINE_PRESETS.default;
  const rawTotal = routine.reduce((sum, item) => sum + item.price, 0);
  const discountedTotal = Math.round(rawTotal * 0.85); // 15% bundle discount

  const handleAddBundleToCart = () => {
    setAddingBundle(true);
    routine.forEach((item) => {
      addToCart({
        product: item.id,
        name: item.name,
        image: item.image,
        price: Math.round(item.price * 0.85),
        qty: 1,
        countInStock: 20,
      });
    });

    toast.success('🎉 3-Step Routine Bundle added to cart with 15% discount!');
    setTimeout(() => {
      setAddingBundle(false);
      onClose();
      handleReset();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-rose-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
        
        {/* Modal Header */}
        <div className="bg-linear-to-r from-[#C2185B] to-pink-600 px-6 py-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={18} className="text-amber-300" />
            <span className="text-xs font-bold uppercase tracking-widest text-rose-100">Skin Routine Finder</span>
          </div>
          <h2 className="text-xl font-extrabold">Find Your Perfect Skincare Routine</h2>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {!isCompleted ? (
            <div>
              {/* Progress Indicator */}
              <div className="flex items-center justify-between text-xs text-gray-400 font-semibold mb-2">
                <span>Step {stepIndex + 1} of {QUIZ_STEPS.length}</span>
                <span>{Math.round(((stepIndex + 1) / QUIZ_STEPS.length) * 100)}% Completed</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
                <div
                  className="h-full bg-[#C2185B] transition-all duration-300 rounded-full"
                  style={{ width: `${((stepIndex + 1) / QUIZ_STEPS.length) * 100}%` }}
                />
              </div>

              {/* Question */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{currentStep.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">{currentStep.subtitle}</p>

              {/* Options list */}
              <div className="space-y-3">
                {currentStep.options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectOption(opt.id)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-500 hover:bg-rose-50/50 dark:hover:bg-gray-700/50 transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{opt.icon}</span>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-[#C2185B] transition-colors">
                          {opt.label}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-[#C2185B] group-hover:translate-x-1 transition-all shrink-0" />
                  </button>
                ))}
              </div>

              {stepIndex > 0 && (
                <button
                  onClick={() => setStepIndex(stepIndex - 1)}
                  className="mt-6 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  ← Back to previous question
                </button>
              )}
            </div>
          ) : (
            /* Results Screen */
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={26} className="text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Your Recommended Routine</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Tailored for <span className="font-bold text-[#C2185B] capitalize">{selectedSkinType}</span> skin needs.
                </p>
              </div>

              {/* Products List */}
              <div className="space-y-3 mb-6">
                {routine.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <span className="w-6 h-6 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover shrink-0 bg-white dark:bg-gray-800" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{item.brand}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-[#C2185B]">Rs. {Math.round(item.price * 0.85).toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400 line-through">Rs. {item.price.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Price summary */}
              <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-4 mb-6 border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#C2185B] font-bold uppercase tracking-wider">Routine Bundle Discount</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">You save <span className="font-bold text-green-600 dark:text-green-400">Rs. {Math.round(rawTotal - discountedTotal).toLocaleString()} (15% OFF)</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-gray-900 dark:text-gray-100">Rs. {discountedTotal.toLocaleString()}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw size={14} /> Retake Quiz
                </button>
                <button
                  onClick={handleAddBundleToCart}
                  disabled={addingBundle}
                  className="flex-1 py-3 bg-[#C2185B] hover:bg-[#A31555] text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-200 dark:shadow-none flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                >
                  <ShoppingBag size={14} />
                  {addingBundle ? 'Adding Routine...' : 'Add 3-Step Routine (15% OFF)'}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
