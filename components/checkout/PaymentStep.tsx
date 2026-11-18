'use client';

import { CreditCard } from 'lucide-react';
import { COD_PAYMENT_METHOD } from '@/lib/store';

export default function PaymentStep({ onBack, onProceed }: { onBack: () => void; onProceed: () => void }) {
  return <section className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8">
    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2"><CreditCard size={20} className="text-rose-500" /> Payment Method</h2>
    <label className="flex items-start gap-3 p-4 border-2 border-rose-400 rounded-2xl bg-rose-50 dark:bg-rose-900/20"><input type="radio" name="payment" value={COD_PAYMENT_METHOD} checked readOnly className="mt-1 accent-rose-600" /><span><span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">{COD_PAYMENT_METHOD}</span><span className="block text-sm text-gray-600 dark:text-gray-300 mt-1">Pay the total shown in your order summary when your parcel arrives. No online payment is required.</span></span></label>
    <p className="my-5 text-sm text-gray-500 dark:text-gray-400">Online wallet and card payments are currently unavailable.</p>
    <div className="flex gap-3"><button type="button" onClick={onBack} className="button-secondary flex-1">Back</button><button type="button" onClick={onProceed} className="button-primary flex-1">Review Order</button></div>
  </section>;
}
