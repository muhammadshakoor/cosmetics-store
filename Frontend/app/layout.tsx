import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';

const inter = Inter({ subsets: ['latin'] });

const description = 'Handmade organic soaps, botanical lotions and chemical-free skincare. Cruelty-free, halal, delivered across Pakistan with Cash on Delivery.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'),
  title: {
    default: 'Lumina – Organic Cosmetics & Handmade Skincare',
    template: '%s | Lumina',
  },
  description,
  keywords: 'organic cosmetics, handmade soap, skincare, body care, hair care, natural beauty, Pakistan',
  openGraph: {
    type: 'website',
    siteName: 'Lumina',
    title: 'Lumina – Organic Cosmetics & Handmade Skincare',
    description,
    images: ['/products/organic/artisan-organic-soaps-collection.jpeg'],
    locale: 'en_PK',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

// Runs before React hydrates to prevent theme flash
const themeInitScript = `
(function(){try{
  var t=localStorage.getItem('lumina-theme');
  if(!t)t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
  if(t==='dark')document.documentElement.classList.add('dark');
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} antialiased min-h-screen flex flex-col`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-100 focus:px-4 focus:py-2 focus:bg-white focus:text-[#C2185B] focus:rounded-xl focus:shadow-lg">
          Skip to content
        </a>
        <Providers>
          <Navbar />
          <main id="main-content" className="flex-1 pt-[116px]">
            {children}
          </main>
          <Footer />
          <WhatsAppButton />
        </Providers>
      </body>
    </html>
  );
}
