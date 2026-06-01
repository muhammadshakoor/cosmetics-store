'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';
import { CheckCircle, Package, MapPin, CreditCard, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  name: string;
  qty: number;
  image: string;
  price: number;
  product: string;
}

interface Order {
  _id: string;
  orderItems: OrderItem[];
  shippingAddress: {
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: string;
  itemsPrice: number;
  taxPrice: number;
  shippingPrice: number;
  totalPrice: number;
  isPaid: boolean;
  isDelivered: boolean;
  createdAt: string;
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
    apiFetch<Order>(`/orders/${id}`, {}, user.token)
      .then(setOrder)
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, [id, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-3xl p-6 sm:p-8 mb-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Order Placed!</h1>
          <p className="text-gray-500 text-sm mb-3">Thank you for your purchase. We&apos;ll get it ready for you.</p>
          <p className="text-xs font-mono text-gray-400 bg-white inline-block px-3 py-1 rounded-full border border-gray-100">
            Order ID: {order._id}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Shipping */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MapPin size={12} /> Shipping Address
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {order.shippingAddress.address}<br />
              {order.shippingAddress.city}, {order.shippingAddress.postalCode}<br />
              {order.shippingAddress.country}
            </p>
            <div className="mt-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.isDelivered ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                {order.isDelivered ? 'Delivered' : 'Not yet delivered'}
              </span>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <CreditCard size={12} /> Payment
            </p>
            <p className="text-sm text-gray-700">{order.paymentMethod}</p>
            <div className="mt-3">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${order.isPaid ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                {order.isPaid ? 'Paid' : 'Pending payment'}
              </span>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-1.5">
            <Package size={12} /> Order Items
          </p>
          <div className="space-y-4">
            {order.orderItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-14 h-14 rounded-xl object-cover bg-gray-100 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.qty} × ${item.price.toFixed(2)}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">${(item.qty * item.price).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Price Summary */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">Price Summary</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Items</span><span>${order.itemsPrice.toFixed(2)}</span></div>
            <div className="flex justify-between text-gray-500">
              <span>Shipping</span>
              <span className={order.shippingPrice === 0 ? 'text-green-600' : ''}>{order.shippingPrice === 0 ? 'FREE' : `$${order.shippingPrice.toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-gray-500"><span>Tax</span><span>${order.taxPrice.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-3 mt-1">
              <span>Total</span><span>${order.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/products"
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-rose-200 text-rose-600 font-semibold rounded-2xl hover:bg-rose-50 transition-colors"
          >
            Continue Shopping
          </Link>
          <Link
            href="/profile"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-rose-200 transition-all"
          >
            View My Orders <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
