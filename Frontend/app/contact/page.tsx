'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { PHONE_E164, PHONE_DISPLAY, SUPPORT_EMAIL, BUSINESS_HOURS, whatsappLink } from '@/lib/site';

const SUBJECT_LABELS: Record<string, string> = {
  order: 'Order Issue', product: 'Product Question', return: 'Return / Refund', delivery: 'Delivery Issue', other: 'Other',
};

const inputCls = 'w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-2xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const whatsappFromForm = () => whatsappLink(
    `Hi Lumina! I'm ${form.name || 'a customer'}.${form.subject ? ` (${SUBJECT_LABELS[form.subject]})` : ''}\n\n${form.message}`.trim()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
      setStatus('success');
      setForm({ name: '', email: '', subject: '', message: '', website: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F5] dark:bg-gray-950 py-10 sm:py-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-xs font-bold tracking-[0.2em] text-[#C2185B] uppercase mb-3">Get in Touch</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A0A0E] dark:text-gray-100 mb-4">We&apos;d Love to Hear From You</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-lg mx-auto">Have a question about an order, a product, or just want to say hi? We&apos;re here for you.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Contact Info */}
          <div className="space-y-5">
            {[
              { icon: <MessageCircle size={20} className="text-[#C2185B]" />, title: 'WhatsApp', detail: PHONE_DISPLAY, sub: 'Fastest way to reach us', href: whatsappLink() },
              { icon: <Mail size={20} className="text-[#C2185B]" />, title: 'Email', detail: SUPPORT_EMAIL, sub: 'We reply within 24 hours', href: `mailto:${SUPPORT_EMAIL}` },
              { icon: <Phone size={20} className="text-[#C2185B]" />, title: 'Phone', detail: PHONE_DISPLAY, sub: BUSINESS_HOURS, href: `tel:+${PHONE_E164}` },
              { icon: <MapPin size={20} className="text-[#C2185B]" />, title: 'Location', detail: 'Lahore, Pakistan', sub: 'Serving customers nationwide', href: null },
              { icon: <Clock size={20} className="text-[#C2185B]" />, title: 'Business Hours', detail: 'Monday – Saturday', sub: '10:00 AM – 7:00 PM PKT', href: null },
            ].map(({ icon, title, detail, sub, href }) => (
              <div key={title} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-rose-50 dark:border-gray-700 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center shrink-0">{icon}</div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-0.5">{title}</p>
                  {href ? (
                    <a href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="text-sm font-semibold text-[#1A0A0E] dark:text-gray-100 hover:text-[#C2185B] transition-colors">{detail}</a>
                  ) : (
                    <p className="text-sm font-semibold text-[#1A0A0E] dark:text-gray-100">{detail}</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-7">
            <h2 className="text-xl font-bold text-[#1A0A0E] dark:text-gray-100 mb-6">Send Us a Message</h2>
            {status === 'success' ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-lg font-bold text-[#1A0A0E] dark:text-gray-100 mb-2">Message Sent!</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">We&apos;ll get back to you within 24 hours.</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="px-6 py-2.5 bg-[#C2185B] text-white font-semibold rounded-2xl text-sm hover:bg-[#A31555] transition-colors"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot for spam bots — hidden from people and screen readers */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name *</label>
                    <input
                      id="contact-name" required type="text" autoComplete="name" maxLength={100} value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email *</label>
                    <input
                      id="contact-email" required type="email" autoComplete="email" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      className={inputCls}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Subject *</label>
                  <select
                    id="contact-subject" required value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Select a subject...</option>
                    {Object.entries(SUBJECT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message *</label>
                  <textarea
                    id="contact-message" required rows={5} maxLength={5000} value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us how we can help... (include your order ID if it's about an order)"
                    className={`${inputCls} resize-none`}
                  />
                </div>
                {status === 'error' && (
                  <div role="alert" className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                    {error}{' '}
                    <a href={whatsappFromForm()} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Send it on WhatsApp</a>
                  </div>
                )}
                <button
                  type="submit" disabled={status === 'loading'}
                  className="w-full py-3 bg-[#C2185B] hover:bg-[#A31555] text-white font-bold rounded-2xl text-sm shadow-md hover:shadow-rose-200 dark:hover:shadow-none hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {status === 'loading' ? 'Sending...' : 'Send Message'}
                </button>
                <a
                  href={whatsappFromForm()} target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 border border-[#25D366] text-[#128C7E] dark:text-[#25D366] font-bold rounded-2xl text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                  <MessageCircle size={16} aria-hidden="true" /> Or send via WhatsApp
                </a>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
