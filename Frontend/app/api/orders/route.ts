import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { CreateOrderInputSchema } from '@/types/api';
import { commerceError, escapeHtml, normalizeOrderItems, requireIdempotencyKey } from '@/lib/commerce';

interface SavedOrder {
  id: string;
  totalPrice: number;
  orderItems: { id: string; name: string; qty: number; price: number }[];
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  let checkoutRejected = false;
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
    if (user.isAdmin) return NextResponse.json({ message: 'Admin accounts cannot place orders. Use a customer account.' }, { status: 403 });
    const idempotencyKey = requireIdempotencyKey(request.headers.get('Idempotency-Key'));
    const input = CreateOrderInputSchema.parse(await request.json());
    const { data, error } = await supabase.rpc('checkout_create_order', {
      p_user_id: user.id,
      p_items: normalizeOrderItems(input.orderItems),
      p_address: input.shippingAddress,
      p_phone: input.phone,
      p_payment_method: input.paymentMethod,
      p_coupon_code: input.couponCode || null,
      p_idempotency_key: idempotencyKey,
      p_expected_total: input.expectedTotalPrice ?? null,
    });
    if (error) {
      // These errors come from a rolled-back transaction. All other failures
      // retain the attempt key so a lost response can safely replay the order.
      checkoutRejected = error.code === 'P0001' && [
        'CHECKOUT_STOCK', 'CHECKOUT_PRODUCT', 'CHECKOUT_COUPON',
        'CHECKOUT_PRICE_CHANGED', 'CHECKOUT_INPUT', 'CHECKOUT_PAYMENT',
      ].includes(error.message);
      throw error;
    }
    if (!data?.order) throw new Error('Checkout returned no order');
    const savedOrder = data.order as SavedOrder;
    if (!data.replayed) await sendConfirmation(savedOrder, user.name, user.email);
    return NextResponse.json({ ...toClient(savedOrder), orderItems: savedOrder.orderItems.map(toClient), replayed: Boolean(data.replayed) }, { status: data.replayed ? 200 : 201 });
  } catch (error) {
    console.error('[checkout] Order request failed:', error);
    const result = commerceError(error);
    return NextResponse.json({ message: result.message, ...(checkoutRejected ? { checkoutRejected: true } : {}) }, { status: result.status });
  }
}

async function sendConfirmation(order: SavedOrder, name: string, email: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  const shortId = order.id.slice(-8).toUpperCase();
  const items = order.orderItems.map(item => `<li>${escapeHtml(item.name)} × ${item.qty} — Rs. ${(item.price * item.qty).toFixed(2)}</li>`).join('');
  const html = `<div style="font-family:sans-serif"><h2>Order confirmed #${shortId}</h2><p>Thank you, ${escapeHtml(name)}. Pay cash on delivery.</p><ul>${items}</ul><p>Total: Rs. ${Number(order.totalPrice).toFixed(2)}</p><p><a href="${escapeHtml(siteUrl)}/order/${order.id}">View your order</a></p></div>`;
  const recipients = [email, process.env.ADMIN_EMAIL].filter((value): value is string => Boolean(value));
  const results = await Promise.allSettled(recipients.map(async to => {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `order-${order.id}-${to}` },
      body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL || 'Lumina Store <orders@resend.dev>', to, subject: `Order #${shortId} confirmed — Lumina`, html }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Email service returned ${response.status}`);
  }));
  for (const result of results) if (result.status === 'rejected') console.warn('[checkout] Confirmation email failed:', result.reason);
}
