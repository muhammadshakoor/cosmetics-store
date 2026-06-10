'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    // Simulate submission delay
    await new Promise(r => setTimeout(r, 800));
    setStatus('success');
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-[#FFF8F5] py-16 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-xs font-bold tracking-[0.2em] text-[#C2185B] uppercase mb-3">Get in Touch</p>
          <h1 className="text-4xl font-extrabold text-[#1A0A0E] mb-4">We&apos;d Love to Hear From You</h1>
          <p className="text-gray-500 text-sm max-w-lg mx-auto">Have a question about an order, a product, or just want to say hi? We&apos;re here for you.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

          {/* Contact Info */}
          <div className="space-y-5">
            {[
              {
                icon: <MessageCircle size={20} className="text-[#C2185B]" />,
                title: 'WhatsApp',
                detail: '+92 300 0000000',
                sub: 'Chat with us directly',
                href: 'https://wa.me/923000000000',
              },
              {
                icon: <Mail size={20} className="text-[#C2185B]" />,
                title: 'Email',
                detail: 'support@lumina.pk',
                sub: 'We reply within 24 hours',
                href: 'mailto:support@lumina.pk',
              },
              {
                icon: <Phone size={20} className="text-[#C2185B]" />,
                title: 'Phone',
                detail: '+92 300 0000000',
                sub: 'Mon–Sat, 10am – 7pm',
                href: 'tel:+923000000000',
              },
              {
                icon: <MapPin size={20} className="text-[#C2185B]" />,
                title: 'Location',
                detail: 'Lahore, Pakistan',
                sub: 'Serving customers nationwide',
                href: null,
              },
              {
                icon: <Clock size={20} className="text-[#C2185B]" />,
                title: 'Business Hours',
                detail: 'Monday – Saturday',
                sub: '10:00 AM – 7:00 PM PKT',
                href: null,
              },
            ].map(({ icon, title, detail, sub, href }) => (
              <div key={title} className="bg-white rounded-2xl p-5 border border-rose-50 shadow-sm flex items-start gap-4">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">{icon}</div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-0.5">{title}</p>
                  {href ? (
                    <a href={href} className="text-sm font-semibold text-[#1A0A0E] hover:text-[#C2185B] transition-colors">{detail}</a>
                  ) : (
                    <p className="text-sm font-semibold text-[#1A0A0E]">{detail}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-7">
            <h2 className="text-xl font-bold text-[#1A0A0E] mb-6">Send Us a Message</h2>
            {status === 'success' ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-lg font-bold text-[#1A0A0E] mb-2">Message Sent!</h3>
                <p className="text-gray-400 text-sm mb-6">We&apos;ll get back to you within 24 hours.</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="px-6 py-2.5 bg-[#C2185B] text-white font-semibold rounded-2xl text-sm hover:bg-[#A31555] transition-colors"
                >
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                    <input
                      required type="text" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="Your name"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                    <input
                      required type="email" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="you@example.com"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject *</label>
                  <select
                    required value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent bg-white"
                  >
                    <option value="">Select a subject...</option>
                    <option value="order">Order Issue</option>
                    <option value="product">Product Question</option>
                    <option value="return">Return / Refund</option>
                    <option value="delivery">Delivery Issue</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
                  <textarea
                    required rows={5} value={form.message}
                    onChange={e => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us how we can help..."
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-transparent resize-none"
                  />
                </div>
                <button
                  type="submit" disabled={status === 'loading'}
                  className="w-full py-3 bg-[#C2185B] hover:bg-[#A31555] text-white font-bold rounded-2xl text-sm shadow-md hover:shadow-rose-200 hover:-translate-y-0.5 transition-all disabled:opacity-60"
                >
                  {status === 'loading' ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
