import type { MetadataRoute } from 'next';
import { getCatalog } from './products/_lib/catalog';
import { getSiteUrl } from './products/_lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  if (!siteUrl) return [];
  const pages: MetadataRoute.Sitemap = ['', '/products', '/about', '/contact', '/faq', '/privacy'].map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: 'weekly', priority: path ? 0.6 : 1 }));
  const products = await getCatalog();
  return [...pages, ...products.map((product) => ({ url: `${siteUrl}/products/${encodeURIComponent(product._id)}`, ...(product.updatedAt ? { lastModified: product.updatedAt } : {}), changeFrequency: 'weekly' as const, priority: 0.8 }))];
}
