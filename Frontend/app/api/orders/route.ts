import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const {
      orderItems, shippingAddress, paymentMethod,
      itemsPrice, taxPrice, shippingPrice, totalPrice,
      couponCode, discountAmount,
    } = await request.json();

    if (!orderItems?.length) return NextResponse.json({ message: 'No order items' }, { status: 400 });

    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data: order, error: orderError } = await supabase
      .from('Order')
      .insert({
        id: orderId, userId: user.id,
        address: shippingAddress.address, city: shippingAddress.city,
        postalCode: shippingAddress.postalCode, country: shippingAddress.country,
        paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice,
        discountAmount: discountAmount || 0,
        couponCode: couponCode || null,
        isPaid: false, isDelivered: false,
        status: 'confirmed',
        createdAt: now, updatedAt: now,
      })
      .select().single();

    if (orderError) throw new Error(orderError.message);

    const items = orderItems.map((item: { name: string; qty: number; image: string; price: number; _id: string }) => ({
      id: crypto.randomUUID(),
      orderId, productId: item._id,
      name: item.name, qty: item.qty, image: item.image, price: item.price,
    }));

    const { error: itemsError } = await supabase.from('OrderItem').insert(items);
    if (itemsError) throw new Error(itemsError.message);

    // Reduce stock
    for (const item of orderItems) {
      const { data: product } = await supabase
        .from('Product').select('countInStock').eq('id', item._id).single();
      if (product) {
        const newStock = Math.max(0, product.countInStock - item.qty);
        await supabase.from('Product').update({ countInStock: newStock }).eq('id', item._id);
      }
    }

    // Mark coupon as used
    if (couponCode) {
      await supabase.rpc('increment_coupon_usage', { coupon_code: couponCode }).catch(() => {
        supabase.from('Coupon').select('usedCount').eq('code', couponCode).single()
          .then(({ data }) => {
            if (data) supabase.from('Coupon').update({ usedCount: data.usedCount + 1 }).eq('code', couponCode);
          });
      });
    }

    // Send emails non-blocking
    sendCustomerConfirmation(order, user.name, user.email, orderItems, totalPrice).catch(() => {});
    sendAdminNotification(order, user.name, user.email, orderItems, totalPrice).catch(() => {});

    return NextResponse.json(toClient(order), { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

type Item = { name: string; qty: number; price: number };

function buildItemsHtml(items: Item[]) {
  return items.map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${i.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center">${i.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right">$${(i.price * i.qty).toFixed(2)}</td>
    </tr>`
  ).join('');
}

async function resendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const from = process.env.RESEND_FROM_EMAIL || 'Lumina Store <orders@resend.dev>';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
}

async function sendCustomerConfirmation(
  order: { id: string },
  customerName: string,
  customerEmail: string,
  items: Item[],
  total: number
) {
  const orderId = order.id.slice(-8).toUpperCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

  await resendEmail(
    customerEmail,
    `Order Confirmed #${orderId} — Lumina Cosmetics`,
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0e8ea">
      <div style="background:linear-gradient(135deg,#C2185B,#e91e8c);padding:32px 24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">Thank you, ${customerName}!</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0">Your order has been confirmed.</p>
      </div>
      <div style="padding:24px">
        <p style="color:#555;margin-top:0">Order <strong>#${orderId}</strong> is confirmed and being prepared.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <thead><tr style="background:#fdf2f6">
            <th style="padding:8px 0;text-align:left;font-size:12px;color:#C2185B">ITEM</th>
            <th style="padding:8px 0;text-align:center;font-size:12px;color:#C2185B">QTY</th>
            <th style="padding:8px 0;text-align:right;font-size:12px;color:#C2185B">PRICE</th>
          </tr></thead>
          <tbody>${buildItemsHtml(items)}</tbody>
        </table>
        <div style="text-align:right;font-weight:bold;font-size:16px;color:#1A0A0E">
          Total: $${total.toFixed(2)}
        </div>
        <div style="margin-top:24px;text-align:center">
          <a href="${siteUrl}/order/${order.id}" style="background:#C2185B;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            Track Your Order
          </a>
        </div>
      </div>
      <div style="background:#fdf2f6;padding:16px 24px;text-align:center;font-size:12px;color:#aaa">
        &copy; Lumina Cosmetics &bull; Questions? Reply to this email.
      </div>
    </div>`
  );
}

async function sendAdminNotification(
  order: { id: string },
  customerName: string,
  customerEmail: string,
  items: Item[],
  total: number
) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;
  const orderId = order.id.slice(-8).toUpperCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

  await resendEmail(
    adminEmail,
    `New Order #${orderId} — $${total.toFixed(2)}`,
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#C2185B">New Order Received!</h2>
      <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Total:</strong> $${total.toFixed(2)}</p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#fdf2f6">
          <th style="padding:8px;text-align:left">Item</th>
          <th style="padding:8px;text-align:center">Qty</th>
          <th style="padding:8px;text-align:right">Price</th>
        </tr></thead>
        <tbody>${buildItemsHtml(items)}</tbody>
      </table>
      <p style="margin-top:24px">
        <a href="${siteUrl}/admin/orders" style="color:#C2185B">View in Admin Panel</a>
      </p>
    </div>`
  );
}
