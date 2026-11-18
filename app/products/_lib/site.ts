export function getSiteUrl(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured) return process.env.NODE_ENV === 'production' ? null : 'http://localhost:3001';
  try {
    const url = new URL(configured);
    return ['https:', 'http:'].includes(url.protocol) ? url.origin : null;
  } catch { return null; }
}

export function absoluteProductImage(src: string): string | undefined {
  try {
    const siteUrl = getSiteUrl();
    const url = new URL(src, siteUrl || undefined);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}
