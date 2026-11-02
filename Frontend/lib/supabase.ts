import { createClient } from '@supabase/supabase-js';
import dns from 'dns';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('[supabase] Missing SUPABASE_URL environment variable.');
}
if (!supabaseServiceRoleKey) {
  throw new Error('[supabase] Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Cached connection status check (prevents 7-10s hangs when Supabase host is offline or paused)
let cachedStatus: boolean | null = null;
let lastCheckTime = 0;
const CACHE_TTL_MS = 30000; // 30 seconds cache

export async function isSupabaseAvailable(): Promise<boolean> {
  const now = Date.now();
  if (cachedStatus !== null && now - lastCheckTime < CACHE_TTL_MS) {
    return cachedStatus;
  }

  try {
    const url = new URL(supabaseUrl!);
    await new Promise<void>((resolve, reject) => {
      dns.lookup(url.hostname, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    cachedStatus = true;
  } catch {
    cachedStatus = false;
  }

  lastCheckTime = now;
  return cachedStatus;
}

