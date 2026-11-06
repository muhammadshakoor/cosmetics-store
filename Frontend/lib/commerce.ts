import { ZodError } from 'zod';

export type CheckoutItem = { productId: string; qty: number };

/** Canonical cart ordering makes retries independent of display order. */
export function normalizeOrderItems(items: CheckoutItem[]): CheckoutItem[] {
  const quantities = new Map<string, number>();
  for (const { productId, qty } of items) {
    const quantity = (quantities.get(productId) || 0) + qty;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) {
      throw new CommerceError('Quantity must be between 1 and 999', 400);
    }
    quantities.set(productId, quantity);
  }
  return [...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([productId, qty]) => ({ productId, qty }));
}

export class CommerceError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export function requireIdempotencyKey(value: string | null): string {
  if (!value || !/^[a-zA-Z0-9_-]{16,128}$/.test(value)) {
    throw new CommerceError('A valid Idempotency-Key header is required. Please retry checkout.', 400);
  }
  return value;
}

/** Only disclose known business errors; DB internals stay in server logs. */
export function commerceError(error: unknown): { status: number; message: string } {
  if (error instanceof CommerceError) return { status: error.status, message: error.message };
  if (error instanceof ZodError) return { status: 400, message: error.issues[0]?.message || 'Invalid checkout data' };
  if (error instanceof SyntaxError) return { status: 400, message: 'Invalid JSON request' };
  const detail = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  const businessErrors: Record<string, { status: number; message: string }> = {
    CHECKOUT_STOCK: { status: 409, message: 'Some items are no longer available in the requested quantity. Please review your cart.' },
    CHECKOUT_PRODUCT: { status: 409, message: 'A product is no longer available. Please review your cart.' },
    CHECKOUT_COUPON: { status: 400, message: 'This coupon is invalid, expired, exhausted, or does not apply to your cart.' },
    CHECKOUT_PRICE_CHANGED: { status: 409, message: 'Your order total has changed. Please review the latest quote before placing your order.' },
    CHECKOUT_IDEMPOTENCY: { status: 409, message: 'This checkout attempt was already used for a different order. Please start a new attempt.' },
    CHECKOUT_INPUT: { status: 400, message: 'Invalid checkout data' },
    CHECKOUT_PAYMENT: { status: 400, message: 'Cash on Delivery is currently the only supported payment method' },
    ORDER_NOT_FOUND: { status: 404, message: 'Order not found' },
    ORDER_FORBIDDEN: { status: 403, message: 'You cannot update this order' },
    ORDER_TRANSITION: { status: 409, message: 'This order can no longer be changed to that status. Refresh the order and try again.' },
  };
  for (const [code, result] of Object.entries(businessErrors)) if (detail.includes(code)) return result;
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'PGRST202' || code === '42883') {
    return { status: 503, message: 'Checkout is not configured. The store administrator must apply the checkout database migration.' };
  }
  return { status: 503, message: 'The store database is temporarily unavailable. Please try again shortly.' };
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}
