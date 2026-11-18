export interface StoredCartItem {
  product: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  countInStock: number;
}

export interface CartAddition {
  addedQty: number;
  requestedQty: number;
  reason?: 'stock' | 'invalid' | 'admin' | 'loading';
}

export function sanitizeCart(value: unknown): StoredCartItem[] {
  if (!Array.isArray(value)) return [];
  const items = new Map<string, StoredCartItem>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object') continue;
    const item = candidate as Partial<StoredCartItem>;
    if (typeof item.product !== 'string' || !item.product || typeof item.name !== 'string' ||
        typeof item.image !== 'string' || typeof item.price !== 'number' || !Number.isFinite(item.price) || item.price < 0 ||
        typeof item.countInStock !== 'number' || !Number.isInteger(item.countInStock) || item.countInStock <= 0 ||
        typeof item.qty !== 'number' || !Number.isInteger(item.qty) || item.qty <= 0) continue;
    const qty = Math.min(item.countInStock, item.qty + (items.get(item.product)?.qty || 0));
    items.set(item.product, { ...item, qty } as StoredCartItem);
  }
  return [...items.values()];
}

export function addCartItem(items: StoredCartItem[], item: StoredCartItem): StoredCartItem[] {
  return addCartItemWithResult(items, item).items;
}

export function addCartItemWithResult(items: StoredCartItem[], item: StoredCartItem): { items: StoredCartItem[]; addition: CartAddition } {
  const requestedQty = Number.isInteger(item.qty) && item.qty > 0 ? item.qty : 0;
  const valid = sanitizeCart([item])[0];
  if (!valid) return { items, addition: { addedQty: 0, requestedQty, reason: item.countInStock === 0 ? 'stock' : 'invalid' } };
  const existing = items.find((entry) => entry.product === item.product);
  const nextQty = Math.min(valid.countInStock, (existing?.qty || 0) + valid.qty);
  const addedQty = Math.max(0, nextQty - (existing?.qty || 0));
  const updated = existing ? items.map((entry) => entry.product === item.product ? { ...valid, qty: nextQty } : entry) : [...items, valid];
  return { items: updated, addition: { addedQty, requestedQty, ...(addedQty < requestedQty ? { reason: 'stock' as const } : {}) } };
}

export function cartAdditionFeedback(addition: CartAddition, name: string): { kind: 'success' | 'partial' | 'error'; message: string } {
  if (addition.addedQty > 0) return addition.addedQty < addition.requestedQty
    ? { kind: 'partial', message: `Added ${addition.addedQty} of ${addition.requestedQty} ${name} to your cart. The available stock limit has been reached.` }
    : { kind: 'success', message: `Added ${addition.addedQty} × ${name} to your cart.` };
  if (addition.reason === 'admin') return { kind: 'error', message: 'Use a customer account to shop.' };
  if (addition.reason === 'loading') return { kind: 'error', message: 'Your cart is still loading. Please try again.' };
  if (addition.reason === 'stock') return { kind: 'error', message: `No more ${name} can be added at the current stock limit.` };
  return { kind: 'error', message: 'This product could not be added. Refresh the page and try again.' };
}

/** A blocked storage getter or write must leave checkout with an actionable error. */
export function persistCheckoutCoupon(getStorage: () => Pick<Storage, 'setItem' | 'removeItem'>, coupon: { code: string } | null): string | null {
  try {
    const storage = getStorage();
    if (coupon) storage.setItem('coupon', JSON.stringify(coupon));
    else storage.removeItem('coupon');
    return null;
  } catch {
    return 'Your browser blocked site storage. Allow storage for this site, then try checkout again. Your order has not been sent.';
  }
}

export function setCartQuantity(items: StoredCartItem[], product: string, quantity: number): StoredCartItem[] {
  if (!Number.isFinite(quantity)) return items;
  return items.map((item) => item.product === product
    ? { ...item, qty: Math.max(1, Math.min(item.countInStock, Math.trunc(quantity))) }
    : item);
}

/** Keeps rapid additions synchronous while exposing a stable server hydration snapshot. */
export function createCartStore(getStorage: () => Pick<Storage, 'getItem' | 'setItem'>) {
  const serverSnapshot = { items: [] as StoredCartItem[], ready: false };
  let snapshot = serverSnapshot;
  const listeners = new Set<() => void>();
  function notify() { listeners.forEach(listener => listener()); }
  function commit(items: StoredCartItem[]) {
    snapshot = { items, ready: true };
    try { getStorage().setItem('cartItems', JSON.stringify(items)); } catch { /* Keep the in-memory cart when storage is unavailable. */ }
    notify();
  }
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!snapshot.ready) {
        let items: StoredCartItem[] = [];
        try { items = sanitizeCart(JSON.parse(getStorage().getItem('cartItems') || '[]')); } catch { /* Corrupt or blocked storage starts an in-memory cart. */ }
        snapshot = { items, ready: true };
        notify();
      }
      return () => { listeners.delete(listener); };
    },
    add(item: StoredCartItem): CartAddition {
      if (!snapshot.ready) return { addedQty: 0, requestedQty: item.qty, reason: 'loading' };
      const result = addCartItemWithResult(snapshot.items, item);
      if (result.items !== snapshot.items) commit(result.items);
      return result.addition;
    },
    remove(product: string) { if (snapshot.ready) commit(snapshot.items.filter(item => item.product !== product)); },
    setQuantity(product: string, quantity: number) { if (snapshot.ready) commit(setCartQuantity(snapshot.items, product, quantity)); },
    clear() { if (snapshot.ready) commit([]); },
  };
}
