'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ApiError, apiFetch } from '@/lib/api';
import Link from 'next/link';
import { CheckCircle, Package, Truck, MapPin, CreditCard, ArrowRight, Star, ExternalLink, Printer, XCircle, MessageCircle } from 'lucide-react';
import { whatsappLink } from '@/lib/site';
import toast from 'react-hot-toast';
import AccessibleDialog from '@/components/AccessibleDialog';

type OrderStatus = 'placed' | 'confirmed' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';

interface OrderItem { _id: string; name: string; qty: number; image: string; price: number; productId: string; }
interface Order {
  _id: string;
  userId: string;
  reviewedProductIds: string[] | null;
  orderItems: OrderItem[];
  shippingAddress: { address: string; city: string; postalCode: string; country: string };
  paymentMethod: string;
  itemsPrice: number; taxPrice: number; shippingPrice: number; totalPrice: number;
  discountAmount?: number; couponCode?: string | null; cancelReason?: string;
  isPaid: boolean; isDelivered: boolean;
  status: OrderStatus;
  trackingNumber?: string;
  courierService?: string;
  deliveredAt?: string;
  createdAt: string;
}

const STEPS: { key: OrderStatus; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'placed',     label: 'Order Placed',        desc: 'We received your order',         icon: <Package size={18} /> },
  { key: 'confirmed',  label: 'Order Confirmed',      desc: 'Admin confirmed your order',     icon: <CheckCircle size={18} /> },
  { key: 'picked_up',  label: 'Picked Up by Courier', desc: 'Courier collected your package', icon: <Truck size={18} /> },
  { key: 'on_the_way', label: 'Out for Delivery',     desc: 'Your order is on the way!',      icon: <MapPin size={18} /> },
  { key: 'delivered',  label: 'Delivered',            desc: 'Package delivered successfully', icon: <CheckCircle size={18} /> },
];

const STATUS_ORDER: OrderStatus[] = ['placed', 'confirmed', 'picked_up', 'on_the_way', 'delivered'];
const CANCELLABLE: OrderStatus[] = ['placed', 'confirmed'];

const COURIER_LINKS: Record<string, string> = {
  'PostEx':        'https://postex.pk/tracking/',
  'Leopards':      'https://www.leopardscourier.com/leopards-courier/index.php?id=tracking&cn=',
  'TCS':           'https://www.tcsexpress.com/track/',
  'M&P':           'https://mpex.pk/track-consignment?number=',
  'Swyft':         'https://swyftlogistics.com/tracking?trackingNumber=',
  'CallCourier':   'https://www.callcourier.com.pk/tracking?tracking_number=',
  'Pakistan Post': 'https://www.pakpost.gov.pk/tracking.php?trackingnumber=',
};

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { user, authReady } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<{ key: string; order: Order | null; error: string; notFound: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  const requestKey = JSON.stringify([id, user?._id, user?.token, retry]);
  const loading = result?.key !== requestKey;
  const order = result?.key === requestKey ? result.order : null;
  const loadError = result?.key === requestKey ? result.error : '';
  const notFound = result?.key === requestKey && result.notFound;
  const [cancelling, setCancelling] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewFormKey, setReviewFormKey] = useState('');
  const [reviewProductId, setReviewProductId] = useState('');
  const [reviewProductName, setReviewProductName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    if (!authReady) return;
    if (!user) { router.replace(`/login?redirect=${encodeURIComponent(`order/${id}`)}`); return; }
    const controller = new AbortController();
    apiFetch<Order>(`/orders/${id}`, { signal: controller.signal, cache: 'no-store' }, user.token)
      .then(order => { if (!controller.signal.aborted) setResult({ key: requestKey, order, error: '', notFound: false }); })
      .catch(cause => {
        if (!controller.signal.aborted) setResult({ key: requestKey, order: null, notFound: cause instanceof ApiError && [403, 404].includes(cause.status), error: cause instanceof ApiError && cause.status === 401 ? 'Please sign in again to view this order.' : 'We could not load your order. Please try again; this does not mean your order was not placed.' });
      });
    return () => controller.abort();
  }, [id, user, authReady, router, requestKey]);

  const handleCancel = async () => {
    if (!user || !order || !window.confirm('Cancel this order? This can\'t be undone.')) return;
    setCancelling(true);
    try {
      await apiFetch(`/orders/${order._id}/cancel`, { method: 'PUT', body: JSON.stringify({ reason: 'Cancelled by customer' }) }, user.token);
      setResult(prev => prev?.key === requestKey ? { ...prev, order: { ...order, status: 'cancelled' } } : prev);
      toast.success('Your order has been cancelled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const openReview = (productId: string, productName: string) => {
    setReviewProductId(productId); setReviewProductName(productName);
    setReviewRating(5); setReviewComment(''); setReviewError(''); setReviewFormKey(requestKey); setShowReview(true);
  };

  const rememberReview = (productId: string) => {
    setResult(prev => prev?.key === requestKey && prev.order ? {
      ...prev, order: { ...prev.order, reviewedProductIds: [...new Set([...(prev.order.reviewedProductIds || []), productId])] },
    } : prev);
  };

  const handleReview = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!user || !order) return;
    setReviewError('');
    setSubmittingReview(true);
    try {
      await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({ productId: reviewProductId, orderId: order._id, rating: reviewRating, comment: reviewComment }),
      }, user.token);
      toast.success('Review submitted! Thank you 🌟');
      rememberReview(reviewProductId);
      setShowReview(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        rememberReview(reviewProductId); setShowReview(false);
        toast.success('You have already reviewed this product.');
      } else setReviewError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#C2185B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!order) {
    if (!notFound && !loadError) return null;
    return (
      <div className="min-h-[60vh] bg-[#FFF8F5] dark:bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center" role={notFound ? undefined : 'alert'}>
          <Package size={40} className="text-rose-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1A0A0E] dark:text-gray-100 mb-2">{notFound ? 'Order not found' : 'Order details are unavailable'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{notFound ? 'This order does not exist or belongs to another account.' : loadError}</p>
          {!notFound && <div className="mb-5 flex flex-wrap justify-center gap-4"><button onClick={() => setRetry(value => value + 1)} className="rounded-xl bg-rose-700 px-5 py-3 font-semibold text-white">Retry loading order</button><Link href={`/login?redirect=${encodeURIComponent(`order/${id}`)}`} className="py-3 font-semibold text-rose-700 underline dark:text-rose-400">Sign in again</Link></div>}
          <Link href="/profile" className="button-primary text-sm">
            View my orders <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  const shortId = order._id.slice(-10).toUpperCase();
  const isCancelled = order.status === 'cancelled';
  const reviewedProducts = new Set(order.reviewedProductIds || []);
  const canReview = order.userId === user?._id && Array.isArray(order.reviewedProductIds);
  const helpLink = whatsappLink(`Hi Lumina! I need help with my order #${shortId}.`);
  const currentStepIndex = STATUS_ORDER.indexOf(order.status || 'placed');
  const trackingUrl = order.courierService && order.trackingNumber
    ? (COURIER_LINKS[order.courierService] || '') + order.trackingNumber
    : null;

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 py-8 sm:py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Top banner */}
        <div className={`rounded-3xl p-6 mb-8 text-center ${
          isCancelled
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50'
            : order.status === 'delivered'
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-white dark:bg-gray-800 border border-rose-100 dark:border-rose-900/30 shadow-sm'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${order.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
            {isCancelled ? <XCircle size={32} className="text-red-500" /> : order.status === 'delivered' ? <CheckCircle size={32} className="text-green-500" /> : <Package size={32} className="text-brand" />}
          </div>
          <h1 className="text-2xl font-extrabold text-[#1A0A0E] dark:text-gray-100 mb-1">
            {isCancelled                   ? 'Order Cancelled' :
             order.status === 'delivered'  ? 'Order Delivered!' :
             order.status === 'on_the_way' ? 'Your Order is On the Way! 🚚' :
             order.status === 'picked_up'  ? 'Picked Up by Courier' :
             order.status === 'confirmed'  ? 'Order Confirmed ✓' :
             'Order Placed Successfully!'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Order ID: <span className="font-mono font-semibold">#{shortId}</span>
            {' · '}{new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          {isCancelled && order.cancelReason && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">{order.cancelReason}</p>
          )}
          {order.trackingNumber && (
            <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-2 rounded-full shadow-sm">
              <Truck size={14} className="text-brand" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{order.courierService}: <span className="font-mono">{order.trackingNumber}</span></span>
              {trackingUrl && (
                <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-brand font-bold hover:underline ml-1">
                  Track <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── Status Timeline ── */}
        {!isCancelled && <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 sm:p-8 mb-6">
          <h2 className="text-lg font-bold text-[#1A0A0E] dark:text-gray-100 mb-8">Live Order Tracking</h2>
          <div className="relative">
            <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100 dark:bg-gray-700" />
            <div className="space-y-0">
              {STEPS.map((step, i) => {
                const done    = i <= currentStepIndex;
                const current = i === currentStepIndex;
                return (
                  <div key={step.key} className="relative flex items-start gap-5 pb-7 last:pb-0">
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      done ? current ? 'bg-[#C2185B] text-white shadow-lg shadow-rose-200' : 'bg-green-500 text-white' : 'bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600'
                    }`}>
                      {done && !current ? <CheckCircle size={18} /> : step.icon}
                    </div>
                    <div className="pt-1.5 flex-1">
                      <p className={`text-sm font-bold ${done ? 'text-[#1A0A0E] dark:text-gray-100' : 'text-gray-400 dark:text-gray-600'}`}>{step.label}</p>
                      <p className={`text-xs mt-0.5 ${done ? 'text-gray-500 dark:text-gray-400' : 'text-gray-300 dark:text-gray-700'}`}>{step.desc}</p>
                      {step.key === 'delivered' && order.deliveredAt && (
                        <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-0.5">
                          {new Date(order.deliveredAt).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                      )}
                      {step.key === 'picked_up' && order.trackingNumber && done && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{order.courierService} · {order.trackingNumber}</p>
                      )}
                    </div>
                    {current && (
                      <span className="shrink-0 mt-1.5 text-[10px] font-bold text-brand dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 rounded-full">
                        Current Status
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>}

        {/* ── Order Items ── */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1A0A0E] dark:text-gray-100 mb-5">Order Items</h2>
          {order.status === 'delivered' && order.userId === user?._id && !Array.isArray(order.reviewedProductIds) && (
            <p role="alert" className="mb-4 text-sm text-gray-600 dark:text-gray-300">Your review status could not be loaded. <button type="button" onClick={() => setRetry(value => value + 1)} className="font-semibold text-rose-700 underline dark:text-rose-400">Retry review status</button></p>
          )}
          <div className="space-y-4">
            {order.orderItems.map((item) => {
              const pid = item.productId || item._id;
              const reviewed = reviewedProducts.has(pid);
              return (
                <div key={item._id} className="flex items-center gap-4">
                  <img src={item.image} alt={item.name} className="w-16 h-16 rounded-2xl object-cover bg-gray-100 dark:bg-gray-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A0A0E] dark:text-gray-100 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{item.qty} × Rs. {Math.round(item.price).toLocaleString()}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-sm font-bold text-[#1A0A0E] dark:text-gray-100">Rs. {Math.round(item.qty * item.price).toLocaleString()}</p>
                    {order.status === 'delivered' && canReview && (
                      reviewed
                        ? <p className="text-xs text-green-600 dark:text-green-400 font-semibold">✓ Reviewed</p>
                        : <button onClick={() => openReview(pid, item.name)} className="flex items-center gap-1 text-xs text-brand font-bold hover:underline ml-auto">
                            <Star size={11} /> Rate Product
                          </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Shipping + Prices ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><MapPin size={12} /> Shipping Address</p>
            <p className="text-sm font-semibold text-[#1A0A0E] dark:text-gray-100">{order.shippingAddress?.address}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{[order.shippingAddress?.city, order.shippingAddress?.postalCode].filter(Boolean).join(', ')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{order.shippingAddress?.country}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><CreditCard size={12} /> Payment & Summary</p>
            <p className="text-sm font-semibold text-[#1A0A0E] dark:text-gray-100 mb-3">{order.paymentMethod}</p>
            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-between"><span>Items</span><span>Rs. {Math.round(order.itemsPrice || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span className={order.shippingPrice === 0 ? 'text-green-600 dark:text-green-400' : ''}>{order.shippingPrice === 0 ? 'FREE' : `Rs. ${Math.round(order.shippingPrice || 0).toLocaleString()}`}</span></div>
              {(order.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400"><span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span><span>-Rs. {Math.round(order.discountAmount || 0).toLocaleString()}</span></div>
              )}
              <div className="flex justify-between font-bold text-[#1A0A0E] dark:text-gray-100 text-sm border-t border-gray-100 dark:border-gray-700 pt-2 mt-1"><span>Total</span><span>Rs. {Math.round(order.totalPrice || 0).toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-6 text-sm print:hidden">
          {helpLink ? <a href={helpLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-[#128C7E] dark:text-[#25D366] hover:underline">
            <MessageCircle size={15} aria-hidden="true" /> Need help with this order?
          </a> : <Link href="/contact" className="inline-flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-400 hover:underline"><MessageCircle size={15} aria-hidden="true" /> Need help with this order?</Link>}
          {CANCELLABLE.includes(order.status) && (
            <button type="button" onClick={handleCancel} disabled={cancelling} className="font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50">
              {cancelling ? 'Cancelling...' : 'Cancel order'}
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-900 dark:bg-gray-800 text-white font-semibold rounded-2xl hover:bg-black transition-colors text-sm print:hidden"
          >
            <Printer size={15} /> Print Receipt
          </button>
          <Link href="/products" className="button-secondary flex-1 text-sm">
            Continue Shopping
          </Link>
          <Link href="/profile" className="button-primary flex-1 text-sm">
            My Orders <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Review Modal ── */}
      <AccessibleDialog isOpen={showReview && reviewFormKey === requestKey} onClose={() => setShowReview(false)} labelledBy="review-title" className="max-w-md">
          <div className="p-6">
            <h2 id="review-title" className="text-xl font-bold text-[#1A0A0E] dark:text-gray-100 mb-1">Rate Your Purchase</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">{reviewProductName}</p>
            <form onSubmit={handleReview} className="space-y-5">
              {reviewError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{reviewError}</p>}
              <div>
                <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Rating *</p>
                <div className="flex items-center gap-2">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} type="button" onClick={() => setReviewRating(s)} aria-label={`${s} star${s > 1 ? 's' : ''}`} aria-pressed={s === reviewRating} className="hover:scale-110 transition-transform">
                      <Star size={30} className={s <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'} />
                    </button>
                  ))}
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1 font-medium">
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}
                  </span>
                </div>
              </div>
              <div>
                <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your Review *</label>
                <textarea id="review-comment"
                  required minLength={3} maxLength={500} rows={4} value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                  placeholder="Share your experience — quality, packaging, results on your skin..."
                  className="form-input resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowReview(false)} className="button-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submittingReview} className="button-primary flex-1">
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
      </AccessibleDialog>
    </div>
  );
}
