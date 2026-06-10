'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { MapPin, CreditCard, CheckCircle, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Step = 'shipping' | 'payment' | 'review';

interface ShippingAddress {
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, totalPrice, clearCart } = useCart();
  const { user } = useAuth();

  const [step, setStep] = useState<Step>('shipping');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const [shipping, setShipping] = useState<ShippingAddress>({
    address: '',
    city: '',
    postalCode: '',
    country: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');

  const shippingCost = totalPrice >= 2000 ? 0 : 200;
  const grandTotal = totalPrice + shippingCost;

  useEffect(() => {
    if (!user) {
      router.replace('/login?redirect=checkout');
    } else if (cartItems.length === 0) {
      router.replace('/cart');
    } else {
      setReady(true);
    }
  }, [user, cartItems.length, router]);

  if (!ready) return null;

  const handleShippingSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      // Read coupon from sessionStorage if user applied one in cart
      const couponRaw = typeof window !== 'undefined' ? sessionStorage.getItem('coupon') : null;
      const coupon = couponRaw ? JSON.parse(couponRaw) : null;
      const discountAmount = coupon?.discount || 0;
      const finalTotal = parseFloat((grandTotal - discountAmount).toFixed(2));

      const order = await apiFetch<{ _id: string }>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderItems: cartItems.map((item) => ({
            name: item.name,
            qty: item.qty,
            image: item.image,
            price: item.price,
            _id: item.product,
          })),
          shippingAddress: shipping,
          paymentMethod,
          itemsPrice: totalPrice,
          taxPrice: 0,
          shippingPrice: shippingCost,
          totalPrice: finalTotal,
          couponCode: coupon?.code || null,
          discountAmount,
        }),
      }, user!.token);
      sessionStorage.removeItem('coupon');

      clearCart();
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

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <Link href="/cart" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-rose-500 mb-8 transition-colors">
          <ArrowLeft size={14} /> Back to Cart
        </Link>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Checkout</h1>

        {/* Step Indicator */}
        <div className="flex items-center mb-10">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  i <= stepIndex
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                    : 'bg-white text-gray-400 border border-gray-200'
                }`}
              >
                {s.icon}
                <span className="hidden sm:block">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`h-0.5 w-8 sm:w-16 mx-1 transition-colors ${i < stepIndex ? 'bg-rose-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Form */}
          <div className="lg:col-span-2">
            {step === 'shipping' && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <MapPin size={20} className="text-rose-500" /> Shipping Address
                </h2>
                <form onSubmit={handleShippingSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Street Address</label>
                    <input
                      type="text" required value={shipping.address}
                      onChange={(e) => setShipping({ ...shipping, address: e.target.value })}
                      placeholder="123 Main Street, Apt 4B"
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                      <input
                        type="text" required value={shipping.city}
                        onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                        placeholder="New York"
                        className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Postal Code</label>
                      <input
                        type="text" required value={shipping.postalCode}
                        onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                        placeholder="10001"
                        className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                    <input
                      type="text" required value={shipping.country}
                      onChange={(e) => setShipping({ ...shipping, country: e.target.value })}
                      placeholder="United States"
                      className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-linear-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-rose-200 hover:-translate-y-0.5 transition-all"
                  >
                    Continue to Payment
                  </button>
                </form>
              </div>
            )}

            {step === 'payment' && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <CreditCard size={20} className="text-rose-500" /> Payment Method
                </h2>
                <div className="space-y-3 mb-8">
                  {[
                    { label: 'Cash on Delivery (COD)', desc: 'Pay when your order arrives', available: true },
                    { label: 'JazzCash', desc: 'Pay via JazzCash mobile wallet', available: true },
                    { label: 'EasyPaisa', desc: 'Pay via EasyPaisa mobile wallet', available: true },
                    { label: 'Credit / Debit Card', desc: 'Coming soon', available: false },
                  ].map(({ label, desc, available }) => (
                    <label
                      key={label}
                      className={`flex items-center gap-3 p-4 border-2 rounded-2xl transition-all ${
                        paymentMethod === label ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:border-gray-300'
                      } ${!available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <input
                        type="radio" name="payment" value={label} disabled={!available}
                        checked={paymentMethod === label}
                        onChange={() => available && setPaymentMethod(label)}
                        className="accent-rose-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{label}</p>
                        <p className="text-xs text-gray-400">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep('shipping')} className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-2xl hover:bg-gray-50 transition-colors">
                    Back
                  </button>
                  <button onClick={() => setStep('review')} className="flex-1 py-3 bg-linear-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-rose-200 hover:-translate-y-0.5 transition-all">
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {step === 'review' && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <CheckCircle size={20} className="text-rose-500" /> Review Your Order
                </h2>
                <div className="mb-5 p-4 bg-gray-50 rounded-2xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Shipping To</p>
                      <p className="text-sm text-gray-700">
                        {shipping.address}, {shipping.city}, {shipping.postalCode}, {shipping.country}
                      </p>
                    </div>
                    <button onClick={() => setStep('shipping')} className="text-xs text-rose-500 hover:text-rose-700 font-medium">Edit</button>
                  </div>
                </div>
                <div className="mb-5 p-4 bg-gray-50 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Payment</p>
                      <p className="text-sm text-gray-700">{paymentMethod}</p>
                    </div>
                    <button onClick={() => setStep('payment')} className="text-xs text-rose-500 hover:text-rose-700 font-medium">Edit</button>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  {cartItems.map((item) => (
                    <div key={item.product} className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="w-14 h-14 object-cover rounded-xl bg-gray-100 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">Qty: {item.qty}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">Rs. {Math.round(item.price * item.qty).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setStep('payment')} className="flex-1 py-3 border border-gray-200 text-gray-600 font-medium rounded-2xl hover:bg-gray-50 transition-colors">
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder} disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-linear-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-rose-200 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Lock size={14} />
                    {loading ? 'Placing Order...' : 'Place Order'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Order Summary</h2>
              <div className="space-y-2 text-sm mb-5">
                {cartItems.map((item) => (
                  <div key={item.product} className="flex justify-between text-gray-600">
                    <span className="truncate mr-2">{item.name} × {item.qty}</span>
                    <span className="font-medium shrink-0">Rs. {Math.round(item.price * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>Rs. {Math.round(totalPrice).toLocaleString()}</span></div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span className={shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
                    {shippingCost === 0 ? 'FREE' : `Rs. ${shippingCost}`}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-3 mt-1">
                  <span>Total</span><span>Rs. {Math.round(grandTotal).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 text-xs text-gray-400 justify-center">
                <Lock size={12} /> Secure & encrypted checkout
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
