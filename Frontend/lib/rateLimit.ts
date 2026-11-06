import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const buckets = new Map<string, { count: number; expires: number }>();

/** Shared database counters in production; a bounded in-memory store for development. */
export async function rateLimit(request: NextRequest, scope: string, limit = 10, windowSeconds = 600): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const key = createHash('sha256').update(`${process.env.JWT_SECRET || 'development'}:${scope}:${ip}`).digest('hex');
  let allowed: boolean;
  if (process.env.NODE_ENV === 'production') {
    const { data, error } = await supabase.rpc('consume_rate_limit', { p_key: key, p_limit: limit, p_window_seconds: windowSeconds });
    if (error) return NextResponse.json({ message: 'This service is temporarily unavailable. Please try again later.' }, { status: 503 });
    allowed = data === true;
  } else {
    const now = Date.now();
    for (const [id, bucket] of buckets) if (bucket.expires <= now) buckets.delete(id);
    const bucket = buckets.get(key) || { count: 0, expires: now + windowSeconds * 1000 };
    bucket.count++;
    buckets.set(key, bucket);
    allowed = bucket.count <= limit;
  }
  return allowed ? null : NextResponse.json({ message: 'Too many attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(windowSeconds) } });
}
