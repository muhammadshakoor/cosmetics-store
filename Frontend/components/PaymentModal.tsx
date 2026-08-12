'use client';

import { useState } from 'react';
import { X, CreditCard, ShieldCheck, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (details: { method: string; transactionId: string }) => void;
  totalAmount: number;
}

export default function PaymentModal({ isOpen, onClose, onPaymentSuccess, totalAmount }: PaymentModalProps) {
  const [method, setMethod] = useState<'jazzcash' | 'easypaisa' | 'card'>('card');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    setTimeout(() => {
      setProcessing(false);
      const txId = 'TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase();
      const methodName = method === 'jazzcash' ? 'JazzCash Mobile Wallet' : method === 'easypaisa' ? 'EasyPaisa Wallet' : 'Credit / Debit Card (Stripe)';
      
      toast.success(`🎉 Payment Authorized! TxID: ${txId}`);
      onPaymentSuccess({ method: methodName, transactionId: txId });
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-rose-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-[#1A0A0E] text-white px-6 py-5 relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-rose-300 font-bold uppercase tracking-wider mb-1">
              <Lock size={12} /> 256-Bit SSL Encrypted
            </div>
            <h2 className="text-xl font-black">Complete Payment</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Amount Box */}
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Amount Due</p>
              <p className="text-2xl font-black text-[#C2185B]">Rs. {Math.round(totalAmount).toLocaleString()}</p>
            </div>
            <ShieldCheck size={28} className="text-green-500" />
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'card', label: '💳 Card', badge: 'Stripe' },
                { id: 'jazzcash', label: '📱 JazzCash', badge: 'Wallet' },
                { id: 'easypaisa', label: '📲 EasyPaisa', badge: 'Wallet' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id as any)}
                  className={`p-3 rounded-2xl border text-xs font-bold text-center transition-all ${
                    method === m.id
                      ? 'border-[#C2185B] bg-rose-50/70 dark:bg-rose-900/30 text-[#C2185B] ring-2 ring-rose-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <p className="font-extrabold">{m.label}</p>
                  <span className="text-[10px] text-gray-400 font-normal">{m.badge}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Method Fields */}
          {method === 'card' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Cardholder Name</label>
                <input
                  type="text" required placeholder="Ayesha Khan"
                  value={cardName} onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Card Number</label>
                <input
                  type="text" required placeholder="4242 •••• •••• 4242"
                  value={cardNumber} onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Expiry (MM/YY)</label>
                  <input
                    type="text" required placeholder="08/28"
                    value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">CVC / CWW</label>
                  <input
                    type="password" required maxLength={4} placeholder="123"
                    value={cardCvc} onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {method === 'jazzcash' ? 'JazzCash Mobile Account Number' : 'EasyPaisa Account Number'}
              </label>
              <input
                type="tel" required placeholder="0300 1234567"
                value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">
                You will receive a USSD prompt / OTP on your mobile phone to approve the transaction.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={processing}
            className="w-full py-3.5 bg-[#C2185B] hover:bg-[#A31555] text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-200 dark:shadow-none flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            {processing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Authorizing Payment...
              </>
            ) : (
              <>
                Pay Rs. {Math.round(totalAmount).toLocaleString()} Now <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
