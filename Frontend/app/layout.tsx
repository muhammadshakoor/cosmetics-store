import type { Metadata } from 'next';
import './globals.css';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import { themeInitScript } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Lumina – Premium Cosmetics & Beauty',
  description: 'Explore cosmetics, skincare, and handcrafted soaps with delivery across Pakistan.',
  keywords: 'cosmetics, beauty, skincare, makeup, fragrance',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased min-h-screen flex flex-col font-sans">
        <Providers>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-rose-700">Skip to content</a>
          <Navbar />
          <main id="main-content" tabIndex={-1} className="flex-1 pt-16">
            {children}
          </main>
          <Footer />
          <WhatsAppButton />
        </Providers>
      </body>
    </html>
  );
}
