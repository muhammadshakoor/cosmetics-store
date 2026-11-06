'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, CreditCard, MapPin } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { ApiError, apiFetch } from '@/lib/api';
import { COD_PAYMENT_METHOD, formatPrice, normalizePakistanPhone } from '@/lib/store';
import { clearCheckoutAttempt, confirmCheckoutAttempt, isDefinitiveCheckoutRejection, loadCheckoutAttempt, saveCheckoutAttempt, type CheckoutAttempt } from '@/lib/checkoutAttempt';
import ShippingStep from '@/components/checkout/ShippingStep';
import PaymentStep from '@/components/checkout/PaymentStep';
import ReviewStep from '@/components/checkout/ReviewStep';
import CheckoutSummary from '@/components/checkout/CheckoutSummary';
import { CreateOrderInputSchema, type ShippingAddress } from '@/types/api';

type Step = 'shipping' | 'payment' | 'review';
interface Quote {
  orderItems: { productId: string; name: string; image: string; price: number; qty: number }[];
  itemsPrice: number; shippingPrice: number; taxPrice: number;
  discountAmount: number; totalPrice: number; couponCode: string | null;
}
interface RecoveryState { userId: string; attempt: CheckoutAttempt | null; error: boolean }

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, removeFromCart, updateQty, cartReady } = useCart();
  const { user, authReady, logout } = useAuth();
  const userId = user?._id || '';
  const [step, setStep] = useState<Step>('shipping');
  const [loading, setLoading] = useState(false);
  const [shippingReady, setShippingReady] = useState(false);
  const [shipping, setShipping] = useState<ShippingAddress>({ address: '', city: '', postalCode: '', country: 'Pakistan', phone: '' });
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [quoteResult, setQuoteResult] = useState<{ key: string; quote: Quote | null; error: string } | null>(null);
  const [submissionError, setSubmissionError] = useState('');
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [quoteRefresh, setQuoteRefresh] = useState(0);
  const [recoveryRefresh, setRecoveryRefresh] = useState(0);
  const [recovery, setRecovery] = useState<RecoveryState | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const submitting = useRef(false);
  const latestCart = useRef(cartItems);
  const stepRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const recoveryRef = useRef<HTMLDivElement>(null);
  const shouldFocusStep = useRef(false);
  const errorField = useRef<string | null>(null);
  const itemKey = JSON.stringify(cartItems.map((item) => ({ productId: item.product, qty: item.qty })).sort((a, b) => a.productId.localeCompare(b.productId)));
  const quoteRequestKey = JSON.stringify([itemKey, couponCode, quoteRefresh]);
  const recoveryReady = !userId || recovery?.userId === userId;
  const pendingAttempt = recovery?.userId === userId ? recovery.attempt : null;
  const recoveryError = recovery?.userId === userId && recovery.error;
  const canQuote = Boolean(authReady && cartReady && shippingReady && recoveryReady && user && !user.isAdmin && cartItems.length && !pendingAttempt && !recoveryError && !confirmedOrderId);
  const quote = quoteResult?.key === quoteRequestKey ? quoteResult.quote : null;
  const quoteError = quoteResult?.key === quoteRequestKey ? quoteResult.error : '';
  const quoteLoading = canQuote && quoteResult?.key !== quoteRequestKey;

  useEffect(() => { latestCart.current = cartItems; }, [cartItems]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('shippingAddress');
      if (saved) {
        const data = JSON.parse(saved);
        setShipping({ address: String(data.address || ''), city: String(data.city || ''), postalCode: String(data.postalCode || ''), country: 'Pakistan', phone: String(data.phone || '') });
      }
      const coupon = JSON.parse(sessionStorage.getItem('coupon') || 'null');
      if (typeof coupon?.code === 'string') setCouponCode(coupon.code);
    } catch { /* ignore damaged address/coupon drafts */ }
    setShippingReady(true);
  }, []);

  useEffect(() => {
    if (!authReady || !userId) return;
    try {
      const attempt = loadCheckoutAttempt(sessionStorage, userId);
      setRecovery({ userId, attempt, error: false });
    } catch { setRecovery({ userId, attempt: null, error: true }); }
  }, [authReady, userId, recoveryRefresh]);

  useEffect(() => {
    if (!shippingReady) return;
    try { sessionStorage.setItem('shippingAddress', JSON.stringify(shipping)); } catch { /* a draft is optional; order-attempt storage is checked before POST */ }
  }, [shipping, shippingReady]);

  useEffect(() => {
    if (authReady && !user) router.replace('/login?redirect=checkout');
  }, [authReady, user, router]);

  useEffect(() => {
    if (!canQuote) return;
    const controller = new AbortController();
    apiFetch<Quote>('/orders/quote', { method: 'POST', signal: controller.signal, body: JSON.stringify({ orderItems: JSON.parse(itemKey), couponCode }) })
      .then((data) => { if (!controller.signal.aborted) setQuoteResult({ key: quoteRequestKey, quote: data, error: '' }); })
      .catch((cause) => { if (!controller.signal.aborted) setQuoteResult({ key: quoteRequestKey, quote: null, error: cause instanceof Error ? cause.message : 'Unable to check your order. Please try again.' }); });
    return () => controller.abort();
  }, [canQuote, itemKey, couponCode, quoteRequestKey]);

  useEffect(() => {
    if (shouldFocusStep.current) { stepRef.current?.focus(); shouldFocusStep.current = false; }
  }, [step]);

  useEffect(() => {
    if (!submissionError) return;
    const field = errorField.current ? document.getElementById(errorField.current) : null;
    if (field instanceof HTMLElement) field.focus();
    else errorRef.current?.focus();
    errorField.current = null;
  }, [submissionError, step]);

  const pendingKey = pendingAttempt?.key || '';
  useEffect(() => { if (pendingKey) recoveryRef.current?.focus(); }, [pendingKey]);

  function goToStep(next: Step) { shouldFocusStep.current = true; setStep(next); }

  async function submitAttempt(attempt: CheckoutAttempt) {
    if (submitting.current || !user || attempt.userId !== user._id) return;
    submitting.current = true;
    setLoading(true);
    setSubmissionError('');
    setNeedsSignIn(false);
    try {
      const order = await confirmCheckoutAttempt(attempt, user.token);
      // Browser storage is best effort after confirmed success; cleanup must not report a failed order.
      try { clearCheckoutAttempt(sessionStorage, user._id); sessionStorage.removeItem('coupon'); } catch { /* a retained key safely replays the confirmed order on the next visit */ }
      setConfirmedOrderId(order._id);
      setRecovery({ userId: user._id, attempt: null, error: false });
      // Subtract confirmed quantities instead of clearing the entire current cart.
      for (const item of attempt.payload.orderItems) {
        const current = latestCart.current.find((entry) => entry.product === item.productId);
        if (!current) continue;
        if (current.qty > item.qty) updateQty(item.productId, current.qty - item.qty);
        else removeFromCart(item.productId);
      }
      router.push(`/order/${order._id}`);
    } catch (cause) {
      if (isDefinitiveCheckoutRejection(cause)) {
        try { clearCheckoutAttempt(sessionStorage, attempt.userId); } catch { /* the next attempt must still be persisted successfully before sending */ }
        setRecovery({ userId: attempt.userId, attempt: null, error: false });
        setQuoteRefresh((value) => value + 1);
        setSubmissionError(cause instanceof Error ? cause.message : 'The order was not accepted. Please review your details.');
      } else {
        const authError = cause instanceof ApiError && (cause.status === 401 || cause.status === 403);
        setNeedsSignIn(authError);
        setSubmissionError(authError ? 'Sign in to the same customer account, then retry this saved order confirmation.' : 'We could not confirm whether your order was accepted. Retry the saved confirmation below; its details and order key will stay the same.');
      }
    } finally { submitting.current = false; setLoading(false); }
  }

  async function handlePlaceOrder() {
    if (submitting.current || pendingAttempt || recoveryError || !quote || quoteLoading || !user || confirmedOrderId) return;
    const phone = normalizePakistanPhone(shipping.phone || '');
    const parsed = CreateOrderInputSchema.safeParse({ orderItems: JSON.parse(itemKey), shippingAddress: shipping, phone: phone || '', paymentMethod: COD_PAYMENT_METHOD, couponCode, expectedTotalPrice: quote.totalPrice });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path[0] === 'phone' ? 'phone' : issue.path[1];
      errorField.current = typeof field === 'string' ? `shipping-${field === 'postalCode' ? 'postal' : field}` : null;
      goToStep('shipping');
      setSubmissionError(issue.message);
      return;
    }
    let attempt: CheckoutAttempt;
    try {
      attempt = saveCheckoutAttempt(sessionStorage, { version: 1, key: crypto.randomUUID(), userId: user._id, createdAt: new Date().toISOString(), payload: parsed.data, items: quote.orderItems });
    } catch {
      setSubmissionError('We could not save this checkout attempt in your browser. Allow site storage and try again. Your order has not been sent.');
      return;
    }
    setRecovery({ userId: user._id, attempt, error: false });
    await submitAttempt(attempt);
  }

  if (!authReady || !cartReady || !shippingReady || !user || !recoveryReady) return <div className="flex min-h-[50vh] items-center justify-center" role="status">Preparing checkout…</div>;
  if (user.isAdmin) return <div className="mx-auto max-w-lg px-4 py-20 text-center"><h1 className="mb-4 text-2xl font-bold">Use a customer account to place an order</h1><Link href="/admin" className="text-rose-600 underline">Return to admin</Link></div>;
  if (confirmedOrderId) return <div role="status" className="px-4 py-20 text-center"><h1 className="mb-4 text-2xl font-bold">Your order is confirmed</h1><Link href={`/order/${confirmedOrderId}`} className="font-semibold text-rose-700 underline dark:text-rose-400">View your order</Link></div>;

  const verifiedItems = quote?.orderItems.map((item) => ({ ...item, product: item.productId })) || [];
  const steps = [{ key: 'shipping', label: 'Shipping', icon: MapPin }, { key: 'payment', label: 'Payment', icon: CreditCard }, { key: 'review', label: 'Review', icon: CheckCircle }];
  const stepIndex = steps.findIndex((item) => item.key === step);

  return <div className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-gray-950"><div className="mx-auto max-w-5xl">
    <Link href="/cart" className="mb-8 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-rose-600 dark:text-gray-400"><ArrowLeft size={14} /> Back to Cart</Link>
    <h1 className="mb-8 text-3xl font-extrabold">Checkout</h1>
    {submissionError && <div ref={errorRef} tabIndex={-1} role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 focus:outline-none dark:bg-red-950 dark:text-red-200"><p>{submissionError}</p>{needsSignIn && <button onClick={() => { logout(); router.push('/login?redirect=checkout'); }} className="mt-3 font-semibold underline">Sign in again to confirm this order</button>}</div>}
    {recoveryError ? <section className="rounded-3xl border border-amber-300 bg-white p-6 dark:bg-gray-800"><h2 className="mb-3 text-xl font-bold">Check your last checkout</h2><p className="mb-4 text-sm leading-relaxed">Your browser&apos;s saved checkout details could not be read. Check your order history before starting another order.</p><Link href="/profile" className="mr-4 font-semibold text-rose-700 underline dark:text-rose-400">View my orders</Link><button onClick={() => setRecoveryRefresh((value) => value + 1)} className="font-semibold underline">Retry reading saved checkout</button><button onClick={() => { try { clearCheckoutAttempt(sessionStorage, user._id); setRecovery({ userId: user._id, attempt: null, error: false }); } catch { setSubmissionError('Browser storage is unavailable. Allow site storage to continue checkout.'); } }} className="mt-5 block rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold dark:border-gray-600">I checked my orders; start a new checkout</button></section>
    : pendingAttempt ? <div ref={recoveryRef} tabIndex={-1} role="region" aria-labelledby="recovery-title" className="rounded-3xl border border-amber-300 bg-white p-6 focus:outline-none dark:bg-gray-800"><h2 id="recovery-title" className="mb-3 text-xl font-bold">{loading ? 'Confirming your order…' : 'Your last checkout needs confirmation'}</h2><p className="mb-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">Retry with the saved details to confirm the same order. Finish this confirmation before starting another checkout.</p><ul className="mb-4 space-y-2 text-sm">{pendingAttempt.items.map((item) => <li key={item.productId}>{item.name} × {item.qty}</li>)}</ul><p className="mb-2 text-sm">Delivery: {pendingAttempt.payload.shippingAddress.address}, {pendingAttempt.payload.shippingAddress.city}</p><p className="mb-5 font-bold">Total: {formatPrice(pendingAttempt.payload.expectedTotalPrice || 0)} · {COD_PAYMENT_METHOD}</p><button disabled={loading} onClick={() => submitAttempt(pendingAttempt)} className="rounded-xl bg-rose-700 px-5 py-3 font-bold text-white disabled:opacity-60">{loading ? 'Confirming order…' : 'Retry order confirmation'}</button><Link href="/profile" className="ml-4 inline-block py-3 font-semibold text-rose-700 underline dark:text-rose-400">View my orders</Link><p className="mt-4 text-xs text-gray-600 dark:text-gray-400">Saved {new Date(pendingAttempt.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}. Your current cart and any new prices do not change this saved request.</p></div>
    : !cartItems.length ? <div className="py-12 text-center"><h2 className="mb-3 text-xl font-bold">Your cart is empty</h2><Link href="/products" className="font-semibold text-rose-700 underline dark:text-rose-400">Browse products</Link></div> : <>
      <ol aria-label="Checkout progress" className="mb-8 flex gap-2">{steps.map(({ key, label, icon: Icon }, index) => <li key={key} aria-current={step === key ? 'step' : undefined} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium sm:px-4 sm:text-sm ${index <= stepIndex ? 'bg-rose-600 text-white' : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}><Icon size={16} aria-hidden="true" />{label}</li>)}</ol>
      {quoteError && <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:bg-red-950 dark:text-red-200"><p>{quoteError}</p><div className="mt-2 flex gap-4"><button onClick={() => setQuoteRefresh((value) => value + 1)} className="font-semibold underline">Check prices and stock again</button>{couponCode && <button className="underline" onClick={() => { setCouponCode(null); try { sessionStorage.removeItem('coupon'); } catch { /* quote uses React state */ } }}>Remove coupon</button>}</div></div>}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3"><section ref={stepRef} tabIndex={-1} aria-label={`${step} step`} className="scroll-mt-24 focus:outline-none lg:col-span-2">
        {step === 'shipping' && <ShippingStep shipping={shipping} onChange={(address) => { setShipping(address); setSubmissionError(''); }} onSubmit={(event) => { event.preventDefault(); if (!normalizePakistanPhone(shipping.phone || '')) { errorField.current = 'shipping-phone'; setSubmissionError('Enter a valid Pakistani mobile number.'); return; } setSubmissionError(''); goToStep('payment'); }} />}
        {step === 'payment' && <PaymentStep onBack={() => goToStep('shipping')} onProceed={() => goToStep('review')} />}
        {step === 'review' && <ReviewStep shipping={shipping} paymentMethod={COD_PAYMENT_METHOD} cartItems={verifiedItems} loading={loading} disabled={quoteLoading || !quote} onEditShipping={() => goToStep('shipping')} onEditPayment={() => goToStep('payment')} onBack={() => goToStep('payment')} onPlaceOrder={handlePlaceOrder} />}
      </section><div aria-live="polite" aria-busy={quoteLoading} className="lg:col-span-1">{quoteLoading ? <div role="status" className="rounded-3xl bg-white p-6 dark:bg-gray-800">Checking current prices and availability…</div> : quote ? <CheckoutSummary cartItems={verifiedItems} totalPrice={quote.itemsPrice} shippingCost={quote.shippingPrice} grandTotal={quote.totalPrice + quote.discountAmount} discountAmount={quote.discountAmount} /> : <p className="p-6 text-sm text-gray-600 dark:text-gray-400">Your total will appear once prices and stock are verified.</p>}</div></div>
    </>}
  </div></div>;
}
