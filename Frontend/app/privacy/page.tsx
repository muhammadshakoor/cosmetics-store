export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FFF8F5] py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 sm:p-12">
          <p className="text-xs font-bold tracking-[0.2em] text-[#C2185B] uppercase mb-3">Legal</p>
          <h1 className="text-4xl font-extrabold text-[#1A0A0E] mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-10">Last updated: June 2025</p>

          <div className="prose prose-sm max-w-none text-gray-600 space-y-8">

            <section>
              <h2 className="text-lg font-bold text-[#1A0A0E] mb-3">1. Information We Collect</h2>
              <p className="leading-relaxed">When you create an account or place an order on Lumina, we collect:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Full name and email address</li>
                <li>Shipping address and phone number</li>
                <li>Order history and payment method (we do not store card details)</li>
                <li>Device and browser information for analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1A0A0E] mb-3">2. How We Use Your Information</h2>
              <p className="leading-relaxed">We use your data to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Process and deliver your orders</li>
                <li>Send order confirmations and tracking updates via email</li>
                <li>Respond to customer support queries</li>
                <li>Improve our website and product offerings</li>
                <li>Send promotional emails (you may unsubscribe at any time)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1A0A0E] mb-3">3. Data Sharing</h2>
              <p className="leading-relaxed">
                We do not sell or rent your personal data to third parties. We share data only with:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Courier services (PostEx, TCS, Leopards) solely for delivery purposes</li>
                <li>Payment processors (JazzCash, EasyPaisa) to complete transactions</li>
                <li>Cloud hosting providers who store data securely</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1A0A0E] mb-3">4. Cookies</h2>
              <p className="leading-relaxed">
                We use essential cookies to keep you logged in and remember your cart. We also use analytics cookies to understand how visitors use our site. You can disable cookies in your browser settings, though some features may not work correctly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1A0A0E] mb-3">5. Data Security</h2>
              <p className="leading-relaxed">
                Your data is stored on secure, encrypted servers. Passwords are hashed and never stored in plain text. We regularly review our security practices to keep your information safe.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1A0A0E] mb-3">6. Your Rights</h2>
              <p className="leading-relaxed">You have the right to:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Access the personal data we hold about you</li>
                <li>Request correction or deletion of your data</li>
                <li>Unsubscribe from marketing emails at any time</li>
                <li>Request a copy of your data</li>
              </ul>
              <p className="leading-relaxed mt-3">To exercise any of these rights, contact us at <a href="mailto:support@lumina.pk" className="text-[#C2185B] hover:underline">support@lumina.pk</a>.</p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1A0A0E] mb-3">7. Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this policy from time to time. We will notify you of any significant changes by email or by posting a notice on our website.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-[#1A0A0E] mb-3">8. Contact</h2>
              <p className="leading-relaxed">
                For any privacy-related questions, email us at{' '}
                <a href="mailto:support@lumina.pk" className="text-[#C2185B] hover:underline">support@lumina.pk</a> or visit our{' '}
                <a href="/contact" className="text-[#C2185B] hover:underline">Contact page</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
