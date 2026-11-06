import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct } from '../_lib/catalog';
import { absoluteProductImage, getSiteUrl } from '../_lib/site';
import ProductDetail from './ProductDetail';

export const dynamic = 'force-dynamic';
type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: 'Product Not Found | Lumina', robots: { index: false, follow: true } };
  const title = `${product.name} | Lumina`;
  const description = product.description.slice(0, 160);
  const siteUrl = getSiteUrl();
  const url = siteUrl ? `${siteUrl}/products/${encodeURIComponent(product._id)}` : undefined;
  const image = absoluteProductImage(product.image);
  return { title, description, ...(url ? { alternates: { canonical: url } } : {}), openGraph: { title, description, ...(url ? { url } : {}), ...(image ? { images: [{ url: image, alt: product.name }] } : {}) } };
}

export default async function ProductPage({ params }: PageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const siteUrl = getSiteUrl();
  const image = absoluteProductImage(product.image);
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description,
    sku: product._id, brand: { '@type': 'Brand', name: product.brand },
    ...(image ? { image } : {}),
    offers: { '@type': 'Offer', priceCurrency: 'PKR', price: product.price, availability: product.countInStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', ...(siteUrl ? { url: `${siteUrl}/products/${encodeURIComponent(product._id)}` } : {}) },
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} /><ProductDetail key={product._id} product={product} /></>;
}
