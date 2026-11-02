'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { MapPin, CreditCard, CheckCircle, ArrowLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import PaymentModal from '@/components/PaymentModal';
import ShippingStep from '@/components/checkout/ShippingStep';
import PaymentStep from '@/components/checkout/PaymentStep';
import ReviewStep from '@/components/checkout/ReviewStep';
import CheckoutSummary from '@/components/checkout/CheckoutSummary';
import type { ShippingAddress } from '@/types/api';

type Step = 'shipping' | 'payment' | 'review';

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, totalPrice, clearCart, cartReady } = useCart();
  const { user, authReady } = useAuth();

  const [step, setStep] = useState<Step>('shipping');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [shipping, setShipping] = useState<ShippingAddress>({
    address: '',
    city: '',
    postalCode: '',
    country: 'Pakistan',
    phone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery (COD)');
  const [showPayModal, setShowPayModal] = useState(false);

  const shippingCost = totalPrice >= 2000 ? 0 : 200;
  const grandTotal = totalPrice + shippingCost;

  // Read coupon discount if present
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const couponRaw = sessionStorage.getItem('coupon');
      if (couponRaw) {
        try {
          const coupon = JSON.parse(couponRaw);
          setDiscountAmount(coupon.discount || 0);
          setCouponCode(coupon.code || null);
        } catch {
          // ignore corrupted sessionStorage
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!authReady || !cartReady) return;
    if (!user) router.replace('/login?redirect=checkout');
    else if (cartItems.length === 0) router.replace('/cart');
    else setReady(true);
  }, [user, authReady, cartReady, cartItems.length, router]);

  if (!ready) return null;

  if (user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-5">
            <Lock size={24} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Admin accounts can&apos;t place orders
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6">
            To test checkout, sign in with a customer account (e.g. <strong>user@lumina.com</strong>).
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="px-5 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              Back to Store
            </Link>
            <Link
              href="/admin"
              className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-2xl transition-colors text-sm"
            >
              Go to Admin Panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      const finalTotal = parseFloat(Math.max(0, grandTotal - discountAmount).toFixed(2));

      const order = await apiFetch<{ _id: string }>(
        '/orders',
        {
          method: 'POST',
          body: JSON.stringify({
            orderItems: cartItems.map((item) => ({
              name: item.name,
              qty: item.qty,
              image: item.image,
              price: item.price,
              _id: item.product,
            })),
            shippingAddress: {
              address: shipping.address,
              city: shipping.city,
              postalCode: shipping.postalCode,
              country: shipping.country,
            },
            phone: shipping.phone,
            paymentMethod,
            itemsPrice: totalPrice,
            taxPrice: 0,
            shippingPrice: shippingCost,
            totalPrice: finalTotal,
            couponCode,
            discountAmount,
          }),
        },
        user!.token
      );

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

  const handlePaymentSuccess = (details: { method: string; transactionId: string }) => {
    setPaymentMethod(`${details.method} (${details.transactionId})`);
    setShowPayModal(false);
    setStep('review');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/cart"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-rose-500 mb-8 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Cart
        </Link>

        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-8">Checkout</h1>

        {/* Step Indicator */}
        <div className="flex items-center mb-10">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  i <= stepIndex
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-200'
                    : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {s.icon}
                <span className="hidden sm:block">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 w-8 sm:w-16 mx-1 transition-colors ${
                    i < stepIndex ? 'bg-rose-400' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Step Form */}
          <div className="lg:col-span-2">
            {step === 'shipping' && (
              <ShippingStep
                shipping={shipping}
                onChange={setShipping}
                onSubmit={handleShippingSubmit}
              />
            )}

            {step === 'payment' && (
              <PaymentStep
                paymentMethod={paymentMethod}
                onSelectMethod={setPaymentMethod}
                onBack={() => setStep('shipping')}
                onProceed={() => {
                  if (paymentMethod !== 'Cash on Delivery (COD)') {
                    setShowPayModal(true);
                  } else {
                    setStep('review');
                  }
                }}
              />
            )}

            {step === 'review' && (
              <ReviewStep
                shipping={shipping}
                paymentMethod={paymentMethod}
                cartItems={cartItems}
                loading={loading}
                onEditShipping={() => setStep('shipping')}
                onEditPayment={() => setStep('payment')}
                onBack={() => setStep('payment')}
                onPlaceOrder={handlePlaceOrder}
              />
            )}
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-1">
            <CheckoutSummary
              cartItems={cartItems}
              totalPrice={totalPrice}
              shippingCost={shippingCost}
              grandTotal={grandTotal}
              discountAmount={discountAmount}
            />
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        totalAmount={Math.max(0, grandTotal - discountAmount)}
      />
    </div>
  );
}
