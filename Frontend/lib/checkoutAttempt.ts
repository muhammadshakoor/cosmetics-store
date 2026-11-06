import { z } from 'zod';
import { CreateOrderInputSchema } from '../types/api';
import { ApiError, apiFetch } from './api';

const AttemptSchema = z.object({
  version: z.literal(1),
  key: z.string().regex(/^[a-zA-Z0-9_-]{16,128}$/),
  userId: z.string().min(1),
  createdAt: z.string().datetime(),
  payload: CreateOrderInputSchema.refine((payload) => payload.expectedTotalPrice !== undefined),
  items: z.array(z.object({ productId: z.string(), name: z.string(), qty: z.number().int().positive(), price: z.number().finite().nonnegative() })),
});

export type CheckoutAttempt = z.infer<typeof AttemptSchema>;
export type CheckoutPayload = z.infer<typeof CreateOrderInputSchema>;
type AttemptStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const storageKey = (userId: string) => `lumina-checkout-attempt:${userId}`;

/** Save the full immutable request before sending it, so reloads can replay it exactly. */
export function saveCheckoutAttempt(storage: AttemptStorage, attempt: CheckoutAttempt): CheckoutAttempt {
  const snapshot = AttemptSchema.parse(attempt);
  storage.setItem(storageKey(snapshot.userId), JSON.stringify(snapshot));
  return snapshot;
}

export function loadCheckoutAttempt(storage: AttemptStorage, userId: string): CheckoutAttempt | null {
  const value = storage.getItem(storageKey(userId));
  if (!value) return null;
  const attempt = AttemptSchema.parse(JSON.parse(value));
  if (attempt.userId !== userId) throw new Error('Saved checkout belongs to another account.');
  return attempt;
}

export function clearCheckoutAttempt(storage: AttemptStorage, userId: string): void {
  storage.removeItem(storageKey(userId));
}

/** An auth/transport/rate-limit error cannot rule out an earlier committed order. */
export function isDefinitiveCheckoutRejection(error: unknown): boolean {
  return error instanceof ApiError && [400, 409].includes(error.status) && error.data.checkoutRejected === true;
}

type OrderRequest = (path: string, options: RequestInit, token: string) => Promise<{ _id: string }>;
export async function confirmCheckoutAttempt(attempt: CheckoutAttempt, token: string, request: OrderRequest = (path, options, auth) => apiFetch<{ _id: string }>(path, options, auth)): Promise<{ _id: string }> {
  const order = await request('/orders', { method: 'POST', headers: { 'Idempotency-Key': attempt.key }, body: JSON.stringify(attempt.payload) }, token);
  if (!order || typeof order._id !== 'string' || !order._id) throw new Error('The order response could not be confirmed. Please retry confirmation.');
  return order;
}
