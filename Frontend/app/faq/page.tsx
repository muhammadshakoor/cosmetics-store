'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

const faqs = [
  {
    category: 'Orders & Delivery',
    items: [
      { q: 'How long does delivery take?', a: 'Standard delivery takes 2–5 business days across Pakistan. Major cities like Lahore, Karachi, and Islamabad usually receive orders within 1–3 days.' },
      { q: 'Do you offer Cash on Delivery (COD)?', a: 'Yes! We offer Cash on Delivery nationwide. You pay when your order arrives at your door.' },
      { q: 'How much does shipping cost?', a: 'Shipping is FREE on all orders over Rs. 2,000. For orders below Rs. 2,000, a flat shipping fee of Rs. 200 applies.' },
      { q: 'Can I track my order?', a: 'Yes. Once your order is dispatched, you\'ll receive a tracking number via email. You can track it directly from your order page under My Account.' },
      { q: 'Can I cancel my order after placing it?', a: 'You can cancel your order from your profile page as long as the status is "Order Placed" or "Confirmed". Once it\'s picked up by the courier, cancellation is no longer possible.' },
    ],
  },
  {
    category: 'Products',
    items: [
      { q: 'Are your products halal and cruelty-free?', a: 'Yes! All Lumina products are halal certified and cruelty-free. We never test on animals and only use permissible ingredients.' },
      { q: 'Are these products original/authentic?', a: 'Absolutely. We source directly from verified suppliers and brands. All products are 100% authentic.' },
      { q: 'Are your products suitable for sensitive skin?', a: 'Most of our products are formulated for all skin types, including sensitive skin. Check the product description for specific details and ingredient lists.' },
    ],
  },
  {
    category: 'Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept Cash on Delivery (COD), JazzCash, and EasyPaisa. Credit/debit card payments are coming soon.' },
      { q: 'How do I use a coupon code?', a: 'Add items to your cart and go to the cart page. You\'ll see a "Coupon Code" field — enter your code and click Apply. The discount will be applied before checkout.' },
    ],
  },
  {
    category: 'Returns & Refunds',
    items: [
      { q: 'What is your return policy?', a: 'We offer a 7-day return policy for damaged or incorrect items. The product must be unused and in its original packaging. Contact us within 7 days of delivery to initiate a return.' },
      { q: 'How do I request a refund?', a: 'Email us at support@lumina.pk or contact us via WhatsApp with your order ID and reason for return. Refunds are processed within 5–7 business days.' },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-[#C2185B] transition-colors"
      >
        <span className="text-sm font-semibold text-[#1A0A0E] dark:text-gray-100 leading-snug">{q}</span>
        <ChevronDown
          size={16}
          className={`text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-4 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 py-16 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-xs font-bold tracking-[0.2em] text-[#C2185B] uppercase mb-3">Help Center</p>
          <h1 className="text-4xl font-extrabold text-[#1A0A0E] dark:text-gray-100 mb-4">Frequently Asked Questions</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Can&apos;t find your answer? <Link href="/contact" className="text-[#C2185B] font-semibold hover:underline">Contact us</Link></p>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-6">
          {faqs.map((section) => (
            <div key={section.category} className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 px-6 py-2">
              <h2 className="text-xs font-bold text-[#C2185B] uppercase tracking-widest py-4 border-b border-rose-50 dark:border-gray-700">
                {section.category}
              </h2>
              {section.items.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          ))}
        </div>

        {/* Still need help */}
        <div className="mt-10 bg-[#C2185B] rounded-3xl p-8 text-center">
          <h3 className="text-xl font-extrabold text-white mb-2">Still Need Help?</h3>
          <p className="text-rose-100 text-sm mb-6">Our team is available Mon–Sat, 10am–7pm PKT</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://wa.me/923000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-white text-[#C2185B] font-bold rounded-2xl text-sm hover:bg-rose-50 transition-colors"
            >
              💬 WhatsApp Us
            </a>
            <Link
              href="/contact"
              className="px-6 py-3 bg-[#1A0A0E] text-white font-bold rounded-2xl text-sm hover:bg-black transition-colors"
            >
              Send a Message
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
