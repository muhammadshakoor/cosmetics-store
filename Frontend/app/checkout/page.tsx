'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/lib/site';
import { MapPin, CreditCard, CheckCircle, ArrowLeft, Lock, Banknote, Smartphone } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Step = 'shipping' | 'payment' | 'review';
type PayType = 'cod' | 'wallet';

interface ShippingAddress {
  address: string; city: string; postalCode: string; phone: string;
}

const PAYMENT_OPTIONS: { id: PayType; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay in cash when your order arrives', icon: <Banknote size={18} /> },
  { id: 'wallet', label: 'JazzCash / EasyPaisa transfer', desc: 'We’ll WhatsApp you our account details after you place the order', icon: <Smartphone size={18} /> },
];
const PAYMENT_LABEL: Record<PayType, string> = {
  cod: 'Cash on Delivery',
  wallet: 'JazzCash / EasyPaisa transfer',
};

const ADDRESS_KEY = 'lumina-address';
const EMPTY_ADDRESS: ShippingAddress = { address: '', city: '', postalCode: '', phone: '' };

function readSaved<T>(storage: 'local' | 'session', key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = (storage === 'local' ? localStorage : sessionStorage).getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, totalPrice, clearCart, hydrated } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('shipping');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  // Pre-fill the address the customer used last time
  const [shipping, setShipping] = useState<ShippingAddress>(() => ({ ...EMPTY_ADDRESS, ...readSaved<ShippingAddress>('local', ADDRESS_KEY) }));
  const [payType, setPayType] = useState<PayType>('cod');
  const [coupon] = useState(() => readSaved<{ code: string; discount: number }>('session', 'coupon'));
  const placingOrder = useRef(false);

  const shippingCost = totalPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const discount = coupon?.discount || 0;
  const grandTotal = Math.max(0, totalPrice + shippingCost - discount);

  useEffect(() => {
    if (placingOrder.current) return; // cart is cleared on success — don't bounce to /cart
    if (!user) router.replace('/login?redirect=checkout');
    else if (!hydrated) return; // wait for the saved cart before deciding it's empty
    else if (cartItems.length === 0) router.replace('/cart');
    else setReady(true);
  }, [user, hydrated, cartItems.length, router]);

  if (!ready) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status">
        <div className="w-8 h-8 border-4 border-rose-200 border-t-[#C2185B] rounded-full animate-spin" aria-label="Loading checkout" />
      </div>
    );
  }

  if (user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-5">
            <Lock size={24} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Admin accounts can&apos;t place orders</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
            To test checkout, sign in with a customer account.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="px-5 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">Back to Store</Link>
            <Link href="/admin" className="px-5 py-2.5 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl transition-colors text-sm">Go to Admin Panel</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleShippingSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    try { localStorage.setItem(ADDRESS_KEY, JSON.stringify(shipping)); } catch { /* storage unavailable */ }
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      // The server recalculates prices, shipping and the coupon discount
      const order = await apiFetch<{ _id: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderItems: cartItems.map((item) => ({ _id: item.product, qty: item.qty })),
          shippingAddress: { address: shipping.address, city: shipping.city, postalCode: shipping.postalCode, country: 'Pakistan' },
          phone: shipping.phone,
          paymentMethod: payType === 'wallet' ? `${PAYMENT_LABEL.wallet} (awaiting payment)` : PAYMENT_LABEL.cod,
          couponCode: coupon?.code || null,
        }),
      }, user!.token);
      placingOrder.current = true;
      sessionStorage.removeItem('coupon');
      clearCart();
      toast.success('Order placed — thank you!');
      router.push(`/order/${order._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'shipping', label: 'Shipping', icon: <MapPin size={16} /> },
    { key: 'payment', label: 'Payment', icon: <CreditCard size={16} /> },
    { key: 'review', label: 'Review', icon: <CheckCircle size={16} /> },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  const inputCls = 'w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';
  const primaryBtn = 'flex-1 flex items-center justify-center gap-2 py-3 bg-[#C2185B] hover:bg-[#A31555] text-white font-semibold rounded-2xl shadow-lg shadow-rose-200 dark:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed';
  const secondaryBtn = 'flex-1 py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-medium rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 sm:py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-rose-500 mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to Cart
        </Link>

        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-6 sm:mb-8">Checkout</h1>

        {/* Step Indicator */}
        <ol className="flex items-center mb-8 sm:mb-10" aria-label="Checkout progress">
          {steps.map((s, i) => (
            <li key={s.key} className="flex items-center" aria-current={i === stepIndex ? 'step' : undefined}>
              <div className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all ${
                i <= stepIndex ? 'bg-[#C2185B] text-white shadow-md shadow-rose-200 dark:shadow-none' : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700'
              }`}>
                {s.icon}
                <span className={i === stepIndex ? 'inline' : 'hidden sm:inline'}>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-6 sm:w-16 mx-1 transition-colors ${i < stepIndex ? 'bg-rose-400' : 'bg-gray-200 dark:bg-gray-700'}`} />
              )}
            </li>
          ))}
        </ol>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-2">
            {step === 'shipping' && (
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <MapPin size={20} className="text-[#C2185B]" /> Delivery Details
                </h2>
                <form onSubmit={handleShippingSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="checkout-phone" className={labelCls}>Mobile Number *</label>
                    <input
                      id="checkout-phone" type="tel" inputMode="tel" autoComplete="tel" required
                      pattern="^(\+?92|0)?3\d{2}[\s-]?\d{7}$"
                      title="Enter a Pakistani mobile number, e.g. 0300-1234567"
                      value={shipping.phone} onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                      placeholder="03xx-xxxxxxx" className={inputCls}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Our rider will call this number before delivery.</p>
                  </div>
                  <div>
                    <label htmlFor="checkout-address" className={labelCls}>Full Address *</label>
                    <input
                      id="checkout-address" type="text" autoComplete="street-address" required
                      value={shipping.address} onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                      placeholder="House #, Street, Area / Sector" className={inputCls}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="checkout-city" className={labelCls}>City *</label>
                      <input
                        id="checkout-city" type="text" autoComplete="address-level2" required
                        value={shipping.city} onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                        placeholder="Lahore, Karachi, Islamabad..." className={inputCls}
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-postal" className={labelCls}>Postal Code <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input
                        id="checkout-postal" type="text" inputMode="numeric" autoComplete="postal-code"
                        value={shipping.postalCode} onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                        placeholder="54000" className={inputCls}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">We currently deliver within Pakistan only.</p>
                  <button type="submit" className={`w-full ${primaryBtn}`}>
                    Continue to Payment
                  </button>
                </form>
              </div>
            )}

            {step === 'payment' && (
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <CreditCard size={20} className="text-[#C2185B]" /> Payment Method
                </h2>
                <fieldset className="space-y-3 mb-8">
                  <legend className="sr-only">Choose how to pay</legend>
                  {PAYMENT_OPTIONS.map(({ id, label, desc, icon }) => (
                    <label key={id} className={`flex items-center gap-3 p-4 border-2 rounded-2xl transition-all cursor-pointer ${
                      payType === id ? 'border-[#C2185B] bg-rose-50 dark:bg-rose-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}>
                      <input type="radio" name="payment" value={id} checked={payType === id} onChange={() => setPayType(id)} className="accent-[#C2185B]" />
                      <span className="text-[#C2185B] dark:text-rose-400" aria-hidden="true">{icon}</span>
                      <span>
                        <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">{label}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">{desc}</span>
                      </span>
                    </label>
                  ))}
                  <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">Card payments are coming soon.</p>
                </fieldset>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('shipping')} className={secondaryBtn}>Back</button>
                  <button type="button" onClick={() => setStep('review')} className={primaryBtn}>Review Order</button>
                </div>
              </div>
            )}

            {step === 'review' && (
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                  <CheckCircle size={20} className="text-[#C2185B]" /> Review Your Order
                </h2>
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/60 rounded-2xl flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Delivering To</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 break-words">{[shipping.address, shipping.city, shipping.postalCode, 'Pakistan'].filter(Boolean).join(', ')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">📱 {shipping.phone}</p>
                  </div>
                  <button type="button" onClick={() => setStep('shipping')} className="text-xs text-[#C2185B] dark:text-rose-400 hover:underline font-medium shrink-0">Edit</button>
                </div>
                <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-700/60 rounded-2xl flex justify-between items-start gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Payment</p>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{PAYMENT_LABEL[payType]}</p>
                    {payType === 'wallet' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">After placing your order you&apos;ll get a WhatsApp link to receive our account details. We dispatch once payment is confirmed.</p>
                    )}
                  </div>
                  <button type="button" onClick={() => setStep('payment')} className="text-xs text-[#C2185B] dark:text-rose-400 hover:underline font-medium shrink-0">Edit</button>
                </div>
                <ul className="space-y-3 mb-6">
                  {cartItems.map((item) => (
                    <li key={item.product} className="flex items-center gap-3">
                      <img src={item.image} alt="" className="w-14 h-14 object-cover rounded-xl bg-gray-100 dark:bg-gray-700 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Qty: {item.qty}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Rs. {Math.round(item.price * item.qty).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep('payment')} className={secondaryBtn}>Back</button>
                  <button type="button" onClick={handlePlaceOrder} disabled={loading} className={primaryBtn}>
                    <Lock size={14} />
                    {loading ? 'Placing Order...' : `Place Order · Rs. ${Math.round(grandTotal).toLocaleString()}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 lg:sticky lg:top-32">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5">Order Summary</h2>
              <div className="space-y-2 text-sm mb-5">
                {cartItems.map((item) => (
                  <div key={item.product} className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span className="truncate mr-2">{item.name} × {item.qty}</span>
                    <span className="font-medium shrink-0">Rs. {Math.round(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-gray-400"><span>Subtotal</span><span>Rs. {Math.round(totalPrice).toLocaleString()}</span></div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Shipping</span>
                  <span className={shippingCost === 0 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>{shippingCost === 0 ? 'FREE' : `Rs. ${shippingCost}`}</span>
                </div>
                {coupon && discount > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                    <span>Discount ({coupon.code})</span><span>-Rs. {Math.round(discount).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 text-base border-t border-gray-100 dark:border-gray-700 pt-3 mt-1">
                  <span>Total</span><span>Rs. {Math.round(grandTotal).toLocaleString()}</span>
                </div>
              </div>
              <ul className="mt-5 space-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                <li className="flex items-center gap-2"><Banknote size={12} aria-hidden="true" /> Pay on delivery — no card needed</li>
                <li className="flex items-center gap-2"><CheckCircle size={12} aria-hidden="true" /> 7-day returns on damaged or incorrect items</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
