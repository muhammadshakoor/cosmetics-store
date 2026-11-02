'use client';

import React from 'react';
import { Lock } from 'lucide-react';

interface CartItemType {
  product: string;
  name: string;
  price: number;
  qty: number;
}

interface CheckoutSummaryProps {
  cartItems: CartItemType[];
  totalPrice: number;
  shippingCost: number;
  grandTotal: number;
  discountAmount?: number;
}

export default function CheckoutSummary({
  cartItems,
  totalPrice,
  shippingCost,
  grandTotal,
  discountAmount = 0,
}: CheckoutSummaryProps) {
  const finalPayable = Math.max(0, grandTotal - discountAmount);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sticky top-24">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-5">Order Summary</h2>

      <div className="space-y-2 text-sm mb-5 max-h-60 overflow-y-auto pr-1">
        {cartItems.map((item) => (
          <div key={item.product} className="flex justify-between text-gray-600 dark:text-gray-400">
            <span className="truncate mr-2">
              {item.name} × {item.qty}
            </span>
            <span className="font-medium shrink-0">
              Rs. {Math.round(item.price * item.qty).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2 text-sm">
        <div className="flex justify-between text-gray-500 dark:text-gray-400">
          <span>Subtotal</span>
          <span>Rs. {Math.round(totalPrice).toLocaleString()}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium">
            <span>Coupon Discount</span>
            <span>- Rs. {Math.round(discountAmount).toLocaleString()}</span>
          </div>
        )}

        <div className="flex justify-between text-gray-500 dark:text-gray-400">
          <span>Shipping</span>
          <span className={shippingCost === 0 ? 'text-green-600 font-medium' : ''}>
            {shippingCost === 0 ? 'FREE' : `Rs. ${shippingCost}`}
          </span>
        </div>

        <div className="flex justify-between font-bold text-gray-900 dark:text-gray-100 text-base border-t border-gray-100 dark:border-gray-700 pt-3 mt-1">
          <span>Total</span>
          <span>Rs. {Math.round(finalPayable).toLocaleString()}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 justify-center">
        <Lock size={12} /> Secure & encrypted checkout
      </div>
    </div>
  );
}

