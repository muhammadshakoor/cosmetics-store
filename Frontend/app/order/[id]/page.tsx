'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { CheckCircle, Package, Truck, MapPin, CreditCard, ArrowRight, Star, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

type OrderStatus = 'placed' | 'confirmed' | 'picked_up' | 'on_the_way' | 'delivered';

interface OrderItem { _id: string; name: string; qty: number; image: string; price: number; productId: string; }
interface Order {
  _id: string;
  orderItems: OrderItem[];
  shippingAddress: { address: string; city: string; postalCode: string; country: string };
  paymentMethod: string;
  itemsPrice: number; taxPrice: number; shippingPrice: number; totalPrice: number;
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
  const { user } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [reviewProductId, setReviewProductId] = useState('');
  const [reviewProductName, setReviewProductName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedProducts, setReviewedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    apiFetch<Order>(`/orders/${id}`, {}, user.token)
      .then(setOrder)
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, [id, user, router]);

  const openReview = (productId: string, productName: string) => {
    setReviewProductId(productId); setReviewProductName(productName);
    setReviewRating(5); setReviewComment(''); setShowReview(true);
  };

  const handleReview = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!user || !order) return;
    setSubmittingReview(true);
    try {
      await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({ productId: reviewProductId, orderId: order._id, rating: reviewRating, comment: reviewComment }),
      }, user.token);
      toast.success('Review submitted! Thank you 🌟');
      setReviewedProducts(prev => new Set([...prev, reviewProductId]));
      setShowReview(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#C2185B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!order) return null;

  const currentStepIndex = STATUS_ORDER.indexOf(order.status || 'placed');
  const trackingUrl = order.courierService && order.trackingNumber
    ? (COURIER_LINKS[order.courierService] || '') + order.trackingNumber
    : null;

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Top banner */}
        <div className={`rounded-3xl p-6 mb-8 text-center ${
          order.status === 'delivered'
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            : 'bg-white dark:bg-gray-800 border border-rose-100 dark:border-rose-900/30 shadow-sm'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${order.status === 'delivered' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-rose-50 dark:bg-rose-900/20'}`}>
            {order.status === 'delivered' ? <CheckCircle size={32} className="text-green-500" /> : <Package size={32} className="text-[#C2185B]" />}
          </div>
          <h1 className="text-2xl font-extrabold text-[#1A0A0E] dark:text-gray-100 mb-1">
            {order.status === 'delivered'  ? 'Order Delivered!' :
             order.status === 'on_the_way' ? 'Your Order is On the Way! 🚚' :
             order.status === 'picked_up'  ? 'Picked Up by Courier' :
             order.status === 'confirmed'  ? 'Order Confirmed ✓' :
             'Order Placed Successfully!'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Order ID: <span className="font-mono font-semibold">#{order._id.slice(-10).toUpperCase()}</span>
          </p>
          {order.trackingNumber && (
            <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-4 py-2 rounded-full shadow-sm">
              <Truck size={14} className="text-[#C2185B]" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{order.courierService}: <span className="font-mono">{order.trackingNumber}</span></span>
              {trackingUrl && (
                <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#C2185B] font-bold hover:underline ml-1">
                  Track <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}
        </div>

        {/* ── Status Timeline ── */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 sm:p-8 mb-6">
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
                      <span className="shrink-0 mt-1.5 text-[10px] font-bold text-[#C2185B] bg-rose-50 dark:bg-rose-900/30 px-2.5 py-1 rounded-full animate-pulse">
                        Current Status
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Order Items ── */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold text-[#1A0A0E] dark:text-gray-100 mb-5">Order Items</h2>
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
                    {order.status === 'delivered' && (
                      reviewed
                        ? <p className="text-xs text-green-600 dark:text-green-400 font-semibold">✓ Reviewed</p>
                        : <button onClick={() => openReview(pid, item.name)} className="flex items-center gap-1 text-xs text-[#C2185B] font-bold hover:underline ml-auto">
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
            <p className="text-xs text-gray-500 dark:text-gray-400">{order.shippingAddress?.city}, {order.shippingAddress?.postalCode}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{order.shippingAddress?.country}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5"><CreditCard size={12} /> Payment & Summary</p>
            <p className="text-sm font-semibold text-[#1A0A0E] dark:text-gray-100 mb-3">{order.paymentMethod}</p>
            <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex justify-between"><span>Items</span><span>Rs. {Math.round(order.itemsPrice || 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Shipping</span><span className={order.shippingPrice === 0 ? 'text-green-600 dark:text-green-400' : ''}>{order.shippingPrice === 0 ? 'FREE' : `Rs. ${Math.round(order.shippingPrice || 0).toLocaleString()}`}</span></div>
              <div className="flex justify-between font-bold text-[#1A0A0E] dark:text-gray-100 text-sm border-t border-gray-100 dark:border-gray-700 pt-2 mt-1"><span>Total</span><span>Rs. {Math.round(order.totalPrice || 0).toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/products" className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-rose-200 dark:border-rose-900/40 text-[#C2185B] font-semibold rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors text-sm">
            Continue Shopping
          </Link>
          <Link href="/profile" className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#C2185B] text-white font-semibold rounded-2xl hover:bg-[#A31555] transition-colors text-sm">
            My Orders <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* ── Review Modal ── */}
      {showReview && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-[#1A0A0E] dark:text-gray-100 mb-1">Rate Your Purchase</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-5">{reviewProductName}</p>
            <form onSubmit={handleReview} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Your Rating *</label>
                <div className="flex items-center gap-2">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} type="button" onClick={() => setReviewRating(s)} className="hover:scale-110 transition-transform">
                      <Star size={30} className={s <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'} />
                    </button>
                  ))}
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1 font-medium">
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Your Review *</label>
                <textarea
                  required rows={4} value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                  placeholder="Share your experience — quality, packaging, results on your skin..."
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowReview(false)} className="flex-1 py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" disabled={submittingReview} className="flex-1 py-3 bg-[#C2185B] hover:bg-[#A31555] text-white font-bold rounded-2xl disabled:opacity-60">
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
