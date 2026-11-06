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
          <label htmlFor="shipping-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Phone Number *
          </label>
          <input
            type="tel"
            id="shipping-phone" name="phone" autoComplete="tel" inputMode="tel"
            pattern="(03[0-9]{2}[ -]?[0-9]{7}|[+]?[9][2][ -]?3[0-9]{2}[ -]?[0-9]{7})"
            title="Enter a Pakistani mobile number, such as 0300 1234567 or +923001234567."
            required
            value={shipping.phone || ''}
            onChange={(e) => onChange({ ...shipping, phone: e.target.value })}
            placeholder="03xx-xxxxxxx"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="shipping-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Street Address *
          </label>
          <input
            type="text"
            id="shipping-address" name="address" autoComplete="street-address" minLength={5} maxLength={250}
            required
            value={shipping.address}
            onChange={(e) => onChange({ ...shipping, address: e.target.value })}
            placeholder="House #, Street, Area"
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="shipping-city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              City *
            </label>
            <input
              type="text"
              id="shipping-city" name="city" autoComplete="address-level2" minLength={2} maxLength={80}
              required
              value={shipping.city}
              onChange={(e) => onChange({ ...shipping, city: e.target.value })}
              placeholder="Karachi, Lahore, Islamabad..."
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="shipping-postal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Postal Code *
            </label>
            <input
              type="text"
              id="shipping-postal" name="postalCode" autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} title="Enter a five-digit Pakistani postal code."
              required
              value={shipping.postalCode}
              onChange={(e) => onChange({ ...shipping, postalCode: e.target.value })}
              placeholder="54000"
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label htmlFor="shipping-country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Country *
          </label>
          <input
            type="text"
            id="shipping-country" name="country" autoComplete="country-name" readOnly
            required
            value={shipping.country}
            onChange={(e) => onChange({ ...shipping, country: e.target.value })}
            placeholder="Pakistan"
            className={inputCls}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">Delivery is available within Pakistan. Your shipping charge is included in the order summary.</p>
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

