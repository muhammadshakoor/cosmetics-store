import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { evaluateCoupon } from '@/lib/coupons';
import { escapeHtml, sendEmail } from '@/lib/email';
import { getLocalProductById, updateLocalProduct } from '@/lib/localProducts';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/lib/site';

type IncomingItem = { _id: string; qty: number };
type PricedItem = { productId: string; name: string; image: string; price: number; qty: number; countInStock: number; inSupabase: boolean };

/** Look up the real product (Supabase first, then the local fallback catalog the storefront also serves). */
async function findProduct(id: string) {
  const { data } = await supabase.from('Product').select('id, name, image, price, countInStock').eq('id', id).single();
  if (data) return { ...data, inSupabase: true };
  const local = getLocalProductById(id);
  return local ? { id: local.id, name: local.name, image: local.image, price: local.price, countInStock: local.countInStock, inSupabase: false } : null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
    if (user.isAdmin) return NextResponse.json({ message: 'Admin accounts cannot place orders. Use a customer account.' }, { status: 403 });

    // Only identities, quantities, address and payment choice come from the client.
    // Prices, shipping, discount and totals are always recalculated here.
    const { orderItems, shippingAddress, paymentMethod, couponCode, phone } = await request.json();

    if (!Array.isArray(orderItems) || orderItems.length === 0)
      return NextResponse.json({ message: 'No order items' }, { status: 400 });
    if (!shippingAddress?.address?.trim() || !shippingAddress?.city?.trim())
      return NextResponse.json({ message: 'Please provide a delivery address and city.' }, { status: 400 });
    if (!phone || String(phone).replace(/\D/g, '').length < 10)
      return NextResponse.json({ message: 'Please provide a valid phone number for delivery.' }, { status: 400 });

    // Merge duplicate lines and validate quantities
    const qtyById = new Map<string, number>();
    for (const item of orderItems as IncomingItem[]) {
      const qty = Number(item?.qty);
      if (!item?._id || !Number.isInteger(qty) || qty < 1)
        return NextResponse.json({ message: 'Invalid item quantity in your cart.' }, { status: 400 });
      qtyById.set(item._id, (qtyById.get(item._id) || 0) + qty);
    }

    const priced: PricedItem[] = [];
    for (const [id, qty] of qtyById) {
      const product = await findProduct(id);
      if (!product)
        return NextResponse.json({ message: 'An item in your cart is no longer available. Please remove it and try again.' }, { status: 400 });
      if (product.countInStock < qty)
        return NextResponse.json({
          message: product.countInStock > 0
            ? `Only ${product.countInStock} of "${product.name}" left in stock. Please update your cart.`
            : `"${product.name}" is sold out. Please remove it from your cart.`,
        }, { status: 400 });
      priced.push({ productId: id, name: product.name, image: product.image, price: product.price, qty, countInStock: product.countInStock, inSupabase: product.inSupabase });
    }

    const itemsPrice = priced.reduce((sum, i) => sum + i.price * i.qty, 0);
    const shippingPrice = itemsPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

    let discountAmount = 0;
    let appliedCoupon: string | null = null;
    if (couponCode) {
      const coupon = await evaluateCoupon(couponCode, itemsPrice);
      if (!coupon.valid)
        return NextResponse.json({ message: `Coupon not applied: ${coupon.message}` }, { status: 400 });
      discountAmount = coupon.discount;
      appliedCoupon = coupon.code;
    }
    const totalPrice = Math.max(0, itemsPrice + shippingPrice - discountAmount);

    const orderId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data: order, error: orderError } = await supabase
      .from('Order')
      .insert({
        id: orderId, userId: user.id,
        address: shippingAddress.address.trim(), city: shippingAddress.city.trim(),
        postalCode: shippingAddress.postalCode || '', country: shippingAddress.country || 'Pakistan',
        phone: String(phone).trim(),
        paymentMethod: String(paymentMethod || 'Cash on Delivery').slice(0, 120),
        itemsPrice, taxPrice: 0, shippingPrice, totalPrice,
        discountAmount,
        couponCode: appliedCoupon,
        isPaid: false, isDelivered: false,
        status: 'confirmed',
        createdAt: now, updatedAt: now,
      })
      .select().single();

    if (orderError) throw new Error(orderError.message);

    const items = priced.map((item) => ({
      id: crypto.randomUUID(),
      orderId, productId: item.productId,
      name: item.name, qty: item.qty, image: item.image, price: item.price,
    }));

    const { error: itemsError } = await supabase.from('OrderItem').insert(items);
    if (itemsError) throw new Error(itemsError.message);

    // Reduce stock
    for (const item of priced) {
      const newStock = Math.max(0, item.countInStock - item.qty);
      if (item.inSupabase) await supabase.from('Product').update({ countInStock: newStock }).eq('id', item.productId);
      else updateLocalProduct(item.productId, { countInStock: newStock });
    }

    // Mark coupon as used
    if (appliedCoupon) {
      const couponCode = appliedCoupon;
      const { error: rpcError } = await supabase.rpc('increment_coupon_usage', { coupon_code: couponCode });
      if (rpcError) {
        const { data: c } = await supabase.from('Coupon').select('usedCount').eq('code', couponCode).single();
        if (c) await supabase.from('Coupon').update({ usedCount: c.usedCount + 1 }).eq('code', couponCode);
      }
    }

    // Send emails non-blocking
    sendCustomerConfirmation(order, user.name, user.email, priced, totalPrice).catch(() => {});
    sendAdminNotification(order, user.name, user.email, priced, totalPrice).catch(() => {});

    return NextResponse.json(toClient(order), { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

type Item = { name: string; qty: number; price: number };

function buildItemsHtml(items: Item[]) {
  return items.map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0">${escapeHtml(i.name)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center">${i.qty}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right">Rs. ${Math.round(i.price * i.qty).toLocaleString()}</td>
    </tr>`
  ).join('');
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

  await sendEmail(
    customerEmail,
    `Order Confirmed #${orderId} — Lumina Cosmetics`,
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0e8ea">
      <div style="background:linear-gradient(135deg,#C2185B,#e91e8c);padding:32px 24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">Thank you, ${escapeHtml(customerName)}!</h1>
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

  await sendEmail(
    adminEmail,
    `New Order #${orderId} — Rs. ${Math.round(total).toLocaleString()}`,
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#C2185B">New Order Received!</h2>
      <p><strong>Customer:</strong> ${escapeHtml(customerName)} (${escapeHtml(customerEmail)})</p>
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
