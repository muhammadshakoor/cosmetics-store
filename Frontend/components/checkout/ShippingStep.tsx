'use client';

import React from 'react';
import { MapPin } from 'lucide-react';
import type { ShippingAddress } from '@/types/api';

interface ShippingStepProps {
  shipping: ShippingAddress;
  onChange: (shipping: ShippingAddress) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function ShippingStep({ shipping, onChange, onSubmit }: ShippingStepProps) {
  const inputCls =
    'w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent text-sm';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
        <MapPin size={20} className="text-rose-500" /> Shipping Address
      </h2>
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Phone Number *
          </label>
          <input
            type="tel"
            required
            value={shipping.phone || ''}
            onChange={(e) => onChange({ ...shipping, phone: e.target.value })}
            placeholder="03xx-xxxxxxx"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Street Address *
          </label>
          <input
            type="text"
            required
            value={shipping.address}
            onChange={(e) => onChange({ ...shipping, address: e.target.value })}
            placeholder="House #, Street, Area"
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              City *
            </label>
            <input
              type="text"
              required
              value={shipping.city}
              onChange={(e) => onChange({ ...shipping, city: e.target.value })}
              placeholder="Karachi, Lahore, Islamabad..."
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Postal Code *
            </label>
            <input
              type="text"
              required
              value={shipping.postalCode}
              onChange={(e) => onChange({ ...shipping, postalCode: e.target.value })}
              placeholder="10001"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Country *
          </label>
          <input
            type="text"
            required
            value={shipping.country}
            onChange={(e) => onChange({ ...shipping, country: e.target.value })}
            placeholder="Pakistan"
            className={inputCls}
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
  );
}

