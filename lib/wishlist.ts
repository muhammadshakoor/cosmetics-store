import { sanitizeWishlistIds } from './browserState';

type WishlistStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readGuestWishlist(storage: WishlistStorage): string[] {
  return sanitizeWishlistIds(JSON.parse(storage.getItem('wishlist') || '[]'));
}

/** Clear only acknowledged items; failed requests and concurrent browser additions stay saved. */
export async function mergeGuestWishlist(storage: WishlistStorage, token: string, signal?: AbortSignal, request: typeof fetch = fetch) {
  const guestIds = readGuestWishlist(storage);
  if (!guestIds.length) return { pendingIds: [], unavailableIds: [] };
  const response = await request('/api/wishlist/merge', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productIds: guestIds }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error('Your browser favorites could not be added to your account yet. They remain saved in this browser.');
  if (!data || !Array.isArray(data.savedIds) || !Array.isArray(data.unavailableIds)) throw new Error('Your browser favorites could not be confirmed. They remain saved in this browser.');
  signal?.throwIfAborted();
  const submitted = new Set(guestIds);
  const acknowledged = new Set([...sanitizeWishlistIds(data.savedIds), ...sanitizeWishlistIds(data.unavailableIds)].filter(id => submitted.has(id)));
  const remaining = readGuestWishlist(storage).filter(id => !acknowledged.has(id));
  if (remaining.length) storage.setItem('wishlist', JSON.stringify(remaining));
  else storage.removeItem('wishlist');
  return { pendingIds: guestIds.filter(id => !acknowledged.has(id)), unavailableIds: sanitizeWishlistIds(data.unavailableIds).filter(id => submitted.has(id)) };
}
