'use client';

import React from 'react';
import { CreditCard } from 'lucide-react';

interface PaymentStepProps {
  paymentMethod: string;
  onSelectMethod: (method: string) => void;
  onBack: () => void;
  onProceed: () => void;
}

export default function PaymentStep({
  paymentMethod,
  onSelectMethod,
  onBack,
  onProceed,
}: PaymentStepProps) {
  const paymentOptions = [
    { label: 'Cash on Delivery (COD)', desc: 'Pay when your order arrives', available: true },
    { label: 'JazzCash / EasyPaisa / Card', desc: 'Instant online authorization', available: true },
  ];

  const isOnlinePayment =
    paymentMethod.includes('JazzCash') ||
    paymentMethod.includes('EasyPaisa') ||
    paymentMethod.includes('Card') ||
    paymentMethod !== 'Cash on Delivery (COD)';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
        <CreditCard size={20} className="text-rose-500" /> Payment Method
      </h2>
      <div className="space-y-3 mb-8">
        {paymentOptions.map(({ label, desc, available }) => {
          const isSelected =
            label === 'Cash on Delivery (COD)'
              ? paymentMethod === 'Cash on Delivery (COD)'
              : isOnlinePayment;

          return (
            <label
              key={label}
              className={`flex items-center gap-3 p-4 border-2 rounded-2xl transition-all ${
                isSelected
                  ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
              } ${!available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input
                type="radio"
                name="payment"
                value={label}
                disabled={!available}
                checked={isSelected}
                onChange={() => available && onSelectMethod(label)}
                className="accent-rose-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{desc}</p>
              </div>
            </label>
          );
        })}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-medium rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onProceed}
          className="flex-1 py-3 bg-linear-to-r from-rose-500 to-pink-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-rose-200 hover:-translate-y-0.5 transition-all"
        >
          {paymentMethod === 'Cash on Delivery (COD)' ? 'Review Order' : 'Authorize Online Payment'}
        </button>
      </div>
    </div>
  );
}

