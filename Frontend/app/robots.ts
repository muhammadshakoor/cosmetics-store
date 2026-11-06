import type { MetadataRoute } from 'next';
import { getSiteUrl } from './products/_lib/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/admin', '/cart', '/checkout', '/profile', '/order/', '/auth/', '/login', '/register', '/complaints'] },
    ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml` } : {}),
  };
}
