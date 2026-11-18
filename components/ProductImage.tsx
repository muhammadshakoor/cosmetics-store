'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';

function canOptimize(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && (['images.unsplash.com', 'res.cloudinary.com', 'picsum.photos'].includes(url.hostname) || url.hostname.endsWith('.supabase.co'));
  } catch { return false; }
}

function validImageSource(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try { return ['http:', 'https:'].includes(new URL(src).protocol); } catch { return false; }
}

export default function ProductImage({ src, alt, sizes, priority = false, className = '', width, height }: { src: string; alt: string; sizes: string; priority?: boolean; className?: string; width?: number; height?: number }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!validImageSource(src) || failedSrc === src) return <div role="img" aria-label={`${alt}: image unavailable`} style={width && height ? { aspectRatio: `${width}/${height}` } : undefined} className={`flex items-center justify-center bg-rose-50 text-gray-400 dark:bg-gray-800 ${width && height ? className : 'h-full w-full'}`}><ShoppingBag aria-hidden="true" size={width && width < 80 ? 20 : 48} /></div>;
  return <Image src={src} alt={alt} {...(width && height ? { width, height } : { fill: true })} sizes={sizes} priority={priority} unoptimized={!canOptimize(src)} className={className} onError={() => setFailedSrc(src)} />;
}
