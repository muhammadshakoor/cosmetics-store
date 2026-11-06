export interface StoredCartItem {
  product: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  countInStock: number;
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
  const valid = sanitizeCart([item])[0];
  if (!valid) return items;
  const existing = items.find((entry) => entry.product === item.product);
  if (!existing) return [...items, valid];
  return items.map((entry) => entry.product === item.product
    ? { ...valid, qty: Math.min(valid.countInStock, existing.qty + valid.qty) }
    : entry);
}

export function setCartQuantity(items: StoredCartItem[], product: string, quantity: number): StoredCartItem[] {
  if (!Number.isFinite(quantity)) return items;
  return items.map((item) => item.product === product
    ? { ...item, qty: Math.max(1, Math.min(item.countInStock, Math.trunc(quantity))) }
    : item);
}
