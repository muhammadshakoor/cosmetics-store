'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowRight, ShoppingBag, Tag, X, CheckCircle, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface CouponResult {
  valid: boolean; code: string; type: string; value: number;
  discount: number; message: string;
}

export default function CartPage() {
  const { cartItems, removeFromCart, updateQty, itemCount, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  const [couponInput, setCouponInput] = useState('');
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  // A coupon's discount was calculated for a specific subtotal — drop it when the cart changes
  // (the code stays in the input so the customer can simply re-apply it).
  const [couponTotal, setCouponTotal] = useState(totalPrice);
  if (couponTotal !== totalPrice) {
    setCouponTotal(totalPrice);
    if (coupon) setCoupon(null);
  }

  const shipping = totalPrice >= 2000 ? 0 : 200;
  const discount = coupon?.discount || 0;
  const grandTotal = Math.max(0, totalPrice + shipping - discount);
  const itemsLabel = `${itemCount} item${itemCount === 1 ? '' : 's'}`;
  const freeShippingThreshold = 2000;
  const progressPct = Math.min((totalPrice / freeShippingThreshold) * 100, 100);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    try {
      const res = await fetch('/api/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput.trim(), orderTotal: totalPrice }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message); return; }
      setCoupon(data);
      toast.success(data.message);
    } catch {
      toast.error('Failed to apply coupon');
    } finally {
      setCheckingCoupon(false);
    }
  };

  const removeCoupon = () => { setCoupon(null); setCouponInput(''); };

  const handleClearCart = () => {
    if (window.confirm('Remove all items from your cart?')) clearCart();
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={36} className="text-rose-300" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A0A0E] dark:text-gray-100 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Looks like you haven&apos;t added anything yet!</p>
          <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl transition-colors shadow-md">
            Start Shopping <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
          <h1 className="text-3xl font-extrabold text-[#1A0A0E] dark:text-gray-100">
            Shopping Cart <span className="text-lg font-medium text-gray-400 dark:text-gray-500">({itemsLabel})</span>
          </h1>
          <button onClick={handleClearCart} className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">Clear cart</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.product} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex gap-4 hover:border-rose-100 dark:hover:border-rose-900/40 transition-colors">
                <Link href={`/products/${item.product}`} tabIndex={-1} aria-hidden="true" className="shrink-0">
                  <img src={item.image || `https://picsum.photos/seed/${item.product}/160/160`} alt={item.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-2xl shrink-0 bg-gray-100 dark:bg-gray-700 hover:opacity-90 transition-opacity" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product}`}>
                    <h3 className="font-semibold text-[#1A0A0E] dark:text-gray-100 text-sm leading-tight mb-1 line-clamp-2 hover:text-[#C2185B] transition-colors">{item.name}</h3>
                  </Link>
                  <p className="text-[#C2185B] font-bold text-lg mb-3">Rs. {Math.round(item.price).toLocaleString()}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                      <button type="button" onClick={() => updateQty(item.product, Math.max(1, item.qty - 1))} disabled={item.qty <= 1} aria-label={`Decrease quantity of ${item.name}`} className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"><Minus size={14} /></button>
                      <span className="px-3 py-1.5 min-w-10 text-center text-sm font-semibold border-x border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100" aria-label={`Quantity ${item.qty}`}>{item.qty}</span>
                      <button type="button" onClick={() => updateQty(item.product, Math.min(item.countInStock, item.qty + 1))} disabled={item.qty >= item.countInStock} aria-label={`Increase quantity of ${item.name}`} className="px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"><Plus size={14} /></button>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">= Rs. {Math.round(item.price * item.qty).toLocaleString()}</span>
                  </div>
                </div>
                <button type="button" onClick={() => removeFromCart(item.product)} aria-label={`Remove ${item.name} from cart`} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors self-start">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 lg:sticky lg:top-32 space-y-5">
              <h2 className="text-lg font-bold text-[#1A0A0E] dark:text-gray-100">Order Summary</h2>

              {totalPrice < freeShippingThreshold && (
                <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl px-4 py-3">
                  <p className="text-xs text-[#C2185B] font-semibold mb-2">
                    Add Rs. {Math.round(freeShippingThreshold - totalPrice).toLocaleString()} more for FREE shipping! 🚚
                  </p>
                  <div className="h-2 bg-rose-100 dark:bg-rose-900/40 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C2185B] rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              )}
              {totalPrice >= freeShippingThreshold && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl px-4 py-3">
                  <p className="text-xs text-green-700 dark:text-green-400 font-semibold">🎉 You qualify for FREE shipping!</p>
                </div>
              )}

              {!coupon ? (
                <div>
                  <label htmlFor="coupon-code" className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Coupon Code</label>
                  <div className="flex gap-2">
                    <input
                      id="coupon-code" type="text" value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder="e.g. LUMINA10"
                      className="flex-1 px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                    <button
                      onClick={handleApplyCoupon} disabled={checkingCoupon || !couponInput.trim()}
                      className="flex items-center gap-1 px-4 py-2.5 bg-[#1A0A0E] dark:bg-gray-700 hover:bg-black dark:hover:bg-gray-600 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
                    >
                      <Tag size={13} />
                      {checkingCoupon ? '...' : 'Apply'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                    <div>
                      <p className="text-xs font-bold text-green-700 dark:text-green-400 font-mono">{coupon.code}</p>
                      <p className="text-xs text-green-600 dark:text-green-500">{coupon.message}</p>
                    </div>
                  </div>
                  <button type="button" onClick={removeCoupon} aria-label="Remove coupon" className="p-1 text-gray-400 hover:text-red-500 transition-colors"><X size={16} /></button>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal ({itemsLabel})</span><span>Rs. {Math.round(totalPrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'text-green-600 font-semibold' : ''}>{shipping === 0 ? 'FREE' : `Rs. ${shipping}`}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
                    <span>Discount ({coupon.code})</span><span>-Rs. {Math.round(discount).toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-gray-100 dark:border-gray-700 pt-3 flex justify-between font-bold text-[#1A0A0E] dark:text-gray-100 text-base">
                  <span>Total</span><span>Rs. {Math.round(grandTotal).toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (coupon) sessionStorage.setItem('coupon', JSON.stringify(coupon));
                  else sessionStorage.removeItem('coupon');
                  router.push(user ? '/checkout' : '/login?redirect=checkout');
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#C2185B] hover:bg-[#A31555] text-white font-bold rounded-2xl shadow-lg hover:-translate-y-0.5 transition-all"
              >
                Proceed to Checkout <ArrowRight size={16} />
              </button>

              <Link href="/products" className="block text-center text-sm text-[#C2185B] hover:underline">
                Continue shopping
              </Link>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-2">We accept</p>
                <div className="flex justify-center gap-3 text-xs font-bold text-gray-500 dark:text-gray-400">
                  <span className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg">💳 JazzCash</span>
                  <span className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg">📱 EasyPaisa</span>
                  <span className="px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-lg">🏠 COD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
