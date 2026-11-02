import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseAvailable } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { CreateOrderInputSchema } from '@/types/api';
import { saveLocalOrder } from '@/lib/localOrders';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
    if (user.isAdmin) return NextResponse.json({ message: 'Admin accounts cannot place orders. Use a customer account.' }, { status: 403 });

    const rawBody = await request.json();
    const parseResult = CreateOrderInputSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid order data';
      return NextResponse.json({ message: firstError }, { status: 400 });
    }

    const {
      orderItems, shippingAddress, paymentMethod,
      itemsPrice, taxPrice, shippingPrice, totalPrice,
      couponCode, discountAmount, phone,
    } = parseResult.data;

    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    const items = orderItems.map((item) => {
      const prodId = item._id || item.product || item.id || crypto.randomUUID();
      return {
        id: crypto.randomUUID(),
        orderId,
        productId: prodId,
        name: item.name,
        qty: item.qty,
        image: item.image,
        price: item.price,
      };
    });

    let savedOrder: any = null;

    if (await isSupabaseAvailable()) {
      try {
        const { data: order, error: orderError } = await supabase
          .from('Order')
          .insert({
            id: orderId, userId: user.id,
            address: shippingAddress.address, city: shippingAddress.city,
            postalCode: shippingAddress.postalCode, country: shippingAddress.country,
            phone: phone || null,
            paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice,
            discountAmount: discountAmount || 0,
            couponCode: couponCode || null,
            isPaid: false, isDelivered: false,
            status: 'confirmed',
            createdAt: now, updatedAt: now,
          })
          .select().single();

        if (!orderError && order) {
          savedOrder = order;
          const { error: itemsError } = await supabase.from('OrderItem').insert(items);
          if (itemsError) {
            console.warn('[orders API] Failed to insert Supabase OrderItems:', itemsError.message);
          }
        } else if (orderError) {
          console.warn('[orders API] Supabase order insert failed:', orderError.message);
        }
      } catch (dbErr) {
        console.warn('[orders API] Database connection offline:', dbErr instanceof Error ? dbErr.message : dbErr);
      }
    }

    // If Supabase was offline or failed in development, persist locally
    if (!savedOrder) {
      if (process.env.NODE_ENV !== 'production') {
        const localCreated = saveLocalOrder({
          id: orderId,
          userId: user.id,
          address: shippingAddress.address,
          city: shippingAddress.city,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
          phone: phone || null,
          paymentMethod,
          itemsPrice,
          taxPrice,
          shippingPrice,
          totalPrice,
          discountAmount: discountAmount || 0,
          couponCode: couponCode || null,
          isPaid: false,
          isDelivered: false,
          isCancelled: false,
          status: 'confirmed',
          createdAt: now,
          updatedAt: now,
          orderItems: items,
        });
        savedOrder = localCreated;
      } else {
        return NextResponse.json({ message: 'Failed to record order. Database temporarily unavailable.' }, { status: 500 });
      }
    }

    // Reduce stock (wrap in try/catch to gracefully handle offline database)
    try {
      for (const item of orderItems) {
        const prodId = item._id || item.product || item.id;
        if (prodId) {
          const { data: product } = await supabase
            .from('Product').select('countInStock').eq('id', prodId).single();
          if (product) {
            const newStock = Math.max(0, product.countInStock - item.qty);
            await supabase.from('Product').update({ countInStock: newStock }).eq('id', prodId);
          }
        }
      }
    } catch (stockErr) {
      console.warn('[orders API] Stock update skipped (offline database):', stockErr);
    }

    // Mark coupon as used (wrap in try/catch to gracefully handle offline database)
    if (couponCode) {
      try {
        const { error: rpcError } = await supabase.rpc('increment_coupon_usage', { coupon_code: couponCode });
        if (rpcError) {
          const { data: c } = await supabase.from('Coupon').select('usedCount').eq('code', couponCode).single();
          if (c) await supabase.from('Coupon').update({ usedCount: c.usedCount + 1 }).eq('code', couponCode);
        }
      } catch (couponErr) {
        console.warn('[orders API] Coupon usage update skipped (offline database):', couponErr);
      }
    }

    // Send emails non-blocking
    sendCustomerConfirmation(savedOrder, user.name, user.email, orderItems, totalPrice).catch((err) => {
      console.warn('[orders API] Customer confirmation email failed:', err);
    });
    sendAdminNotification(savedOrder, user.name, user.email, orderItems, totalPrice).catch((err) => {
      console.warn('[orders API] Admin notification email failed:', err);
    });

    return NextResponse.json(toClient(savedOrder), { status: 201 });
  } catch (e) {
    console.error('[orders API] Unexpected error placing order:', e);
    return NextResponse.json({ message: 'Server error processing order' }, { status: 500 });
  }
}

type Item = { name: string; qty: number; price: number };

function buildItemsHtml(items: Item[]) {
  return items.map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${i.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center">${i.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right">Rs. ${Math.round(i.price * i.qty).toLocaleString()}</td>
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
          Total: Rs. ${Math.round(total).toLocaleString()}
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
    `New Order #${orderId} — Rs. ${Math.round(total).toLocaleString()}`,
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#C2185B">New Order Received!</h2>
      <p><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Total:</strong> Rs. ${Math.round(total).toLocaleString()}</p>
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
