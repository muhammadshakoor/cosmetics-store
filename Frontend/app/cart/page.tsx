'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, ArrowRight, ShoppingBag, Tag, X, CheckCircle } from 'lucide-react';
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

  const shipping = totalPrice > 50 ? 0 : 9.99;
  const tax = totalPrice * 0.08;
  const discount = coupon?.discount || 0;
  const grandTotal = totalPrice + shipping + tax - discount;

  // Free shipping progress
  const freeShippingThreshold = 50;
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

  const removeCoupon = () => {
    setCoupon(null);
    setCouponInput('');
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag size={36} className="text-rose-300" />
          </div>
          <h2 className="text-2xl font-bold text-[#1A0A0E] mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Looks like you haven&apos;t added anything yet!</p>
          <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl transition-colors shadow-md">
            Start Shopping <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-extrabold text-[#1A0A0E]">
            Shopping Cart <span className="text-lg font-medium text-gray-400">({itemCount} items)</span>
          </h1>
          <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-600 transition-colors">Clear cart</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.product} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 flex gap-4 hover:border-rose-100 transition-colors">
                <Link href={`/products/${item.product}`}>
                  <img
                    src={item.image || `https://picsum.photos/seed/${item.product}/160/160`}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-2xl shrink-0 bg-gray-100 hover:opacity-90 transition-opacity"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product}`}>
                    <h3 className="font-semibold text-[#1A0A0E] text-sm leading-tight mb-1 line-clamp-2 hover:text-[#C2185B] transition-colors">{item.name}</h3>
                  </Link>
                  <p className="text-[#C2185B] font-bold text-lg mb-3">${item.price.toFixed(2)}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={() => updateQty(item.product, Math.max(1, item.qty - 1))} className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 font-bold">−</button>
                      <span className="px-3 py-1.5 text-sm font-semibold border-x border-gray-200">{item.qty}</span>
                      <button onClick={() => updateQty(item.product, Math.min(item.countInStock, item.qty + 1))} className="px-3 py-1.5 text-gray-600 hover:bg-gray-50 font-bold">+</button>
                    </div>
                    <span className="text-sm text-gray-400 font-medium">= ${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.product)} className="p-2 text-gray-300 hover:text-red-500 transition-colors self-start">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sticky top-24 space-y-5">
              <h2 className="text-lg font-bold text-[#1A0A0E]">Order Summary</h2>

              {/* Free shipping progress bar */}
              {totalPrice < freeShippingThreshold && (
                <div className="bg-rose-50 rounded-2xl px-4 py-3">
                  <p className="text-xs text-[#C2185B] font-semibold mb-2">
                    Add ${(freeShippingThreshold - totalPrice).toFixed(2)} more for FREE shipping! 🚚
                  </p>
                  <div className="h-2 bg-rose-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#C2185B] rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              )}
              {totalPrice >= freeShippingThreshold && (
                <div className="bg-green-50 rounded-2xl px-4 py-3">
                  <p className="text-xs text-green-700 font-semibold">🎉 You qualify for FREE shipping!</p>
                </div>
              )}

              {/* Coupon Code */}
              {!coupon ? (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Coupon Code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                      placeholder="e.g. LUMINA10"
                      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={checkingCoupon || !couponInput.trim()}
                      className="flex items-center gap-1 px-4 py-2.5 bg-[#1A0A0E] hover:bg-black text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors"
                    >
                      <Tag size={13} />
                      {checkingCoupon ? '...' : 'Apply'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <div>
                      <p className="text-xs font-bold text-green-700 font-mono">{coupon.code}</p>
                      <p className="text-xs text-green-600">{coupon.message}</p>
                    </div>
                  </div>
                  <button onClick={removeCoupon} className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({itemCount} items)</span><span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'text-green-600 font-semibold' : ''}>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (8%)</span><span>${tax.toFixed(2)}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between text-green-600 font-semibold">
                    <span>Discount ({coupon.code})</span><span>-${discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-[#1A0A0E] text-base">
                  <span>Total</span><span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  // Store coupon info for checkout
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

              {/* Payment icons */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center mb-2">We accept</p>
                <div className="flex justify-center gap-3 text-xs font-bold text-gray-500">
                  <span className="px-2 py-1 border rounded-lg">💳 JazzCash</span>
                  <span className="px-2 py-1 border rounded-lg">📱 EasyPaisa</span>
                  <span className="px-2 py-1 border rounded-lg">🏠 COD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
