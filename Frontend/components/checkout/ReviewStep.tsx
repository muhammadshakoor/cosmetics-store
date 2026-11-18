'use client';

import React from 'react';
import { CheckCircle, Lock } from 'lucide-react';
import type { ShippingAddress } from '@/types/api';
import { formatPrice } from '@/lib/store';
import ProductImage from '@/components/ProductImage';

interface CartItemType {
  product: string;
  name: string;
  image: string;
  price: number;
  qty: number;
}

interface ReviewStepProps {
  shipping: ShippingAddress;
  paymentMethod: string;
  cartItems: CartItemType[];
  loading: boolean;
  disabled?: boolean;
  onEditShipping: () => void;
  onEditPayment: () => void;
  onBack: () => void;
  onPlaceOrder: () => void;
}

export default function ReviewStep({
  shipping,
  paymentMethod,
  cartItems,
  loading,
  disabled = false,
  onEditShipping,
  onEditPayment,
  onBack,
  onPlaceOrder,
}: ReviewStepProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
        <CheckCircle size={20} className="text-rose-500" /> Review Your Order
      </h2>

      {/* Shipping details */}
      <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
              Shipping To
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-200">
              {shipping.address}, {shipping.city}, {shipping.postalCode}, {shipping.country}
            </p>
            {shipping.phone && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                📱 {shipping.phone}
              </p>
            )}
          </div>
          <button
            type="button"
            aria-label="Edit shipping address"
            disabled={loading}
            onClick={onEditShipping}
            className="text-sm text-brand min-h-11 min-w-11 underline underline-offset-4 font-medium"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Payment method */}
      <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-700 rounded-2xl">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
              Payment Method
            </p>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{paymentMethod}</p>
          </div>
          <button
            type="button"
            aria-label="Edit payment method"
            disabled={loading}
            onClick={onEditPayment}
            className="text-sm text-brand min-h-11 min-w-11 underline underline-offset-4 font-medium"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-3 mb-6">
        {cartItems.map((item) => (
          <div key={item.product} className="flex items-center gap-3">
            <div className="relative w-14 h-14 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700 shrink-0"><ProductImage src={item.image} alt={item.name} sizes="56px" className="object-cover" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {item.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">Qty: {item.qty}</p>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatPrice(item.price * item.qty)}
            </p>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={onBack}
          className="button-secondary flex-1"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={loading || disabled}
          className="button-primary flex-1 shadow-lg"
        >
          <Lock size={14} />
          {loading ? 'Placing Order...' : 'Place Order'}
        </button>
      </div>
    </div>
  );
}

