import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getSiteUrl } from './_lib/site';

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: 'Shop Cosmetics, Skincare & Handmade Soaps | Lumina',
  description: 'Browse Lumina skincare, handmade soaps, body care, fragrance, and hair care. Shop in Pakistani rupees with delivery across Pakistan.',
  ...(siteUrl ? { alternates: { canonical: `${siteUrl}/products` } } : {}),
};

export default function ProductsLayout({ children }: { children: ReactNode }) {
  return children;
}
