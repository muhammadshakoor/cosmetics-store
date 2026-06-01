import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

export type OrderStatus = 'placed' | 'confirmed' | 'picked_up' | 'on_the_way' | 'delivered';

const STATUS_LABELS: Record<OrderStatus, string> = {
  placed:     'Order Placed',
  confirmed:  'Order Confirmed',
  picked_up:  'Picked Up by Courier',
  on_the_way: 'Out for Delivery',
  delivered:  'Delivered',
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });

    const { id } = await params;
    const { status, trackingNumber, courierService } = await request.json();

    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (courierService) updateData.courierService = courierService;
    if (status === 'delivered') {
      updateData.isDelivered = true;
      updateData.deliveredAt = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('Order')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Fetch customer info for email (non-blocking)
    sendStatusEmail(id, status, trackingNumber, courierService).catch(() => {});

    return NextResponse.json(toClient(data));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

async function sendStatusEmail(
  orderId: string,
  status: OrderStatus,
  trackingNumber?: string,
  courierService?: string
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  // Fetch the order with user info
  const { data: order } = await supabase
    .from('Order')
    .select('id, totalPrice, address, city, trackingNumber, courierService, User!Order_userId_fkey(name, email)')
    .eq('id', orderId)
    .single();

  if (!order) return;

  const customerUser = Array.isArray(order.User) ? order.User[0] : order.User;
  if (!customerUser?.email) return;

  const shortId = orderId.slice(-8).toUpperCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  const label = STATUS_LABELS[status] || status;
  const from = process.env.RESEND_FROM_EMAIL || 'Lumina Store <orders@resend.dev>';

  const trackingBlock = (trackingNumber || order.trackingNumber)
    ? `<p style="margin:16px 0">
        <strong>Courier:</strong> ${courierService || order.courierService}<br/>
        <strong>Tracking #:</strong> ${trackingNumber || order.trackingNumber}
      </p>`
    : '';

  const statusColor: Record<OrderStatus, string> = {
    placed: '#3b82f6', confirmed: '#7c3aed',
    picked_up: '#d97706', on_the_way: '#ea580c', delivered: '#16a34a',
  };
  const color = statusColor[status] || '#C2185B';

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #f0e8ea">
      <div style="background:${color};padding:28px 24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:22px">${label}</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0">Order #${shortId}</p>
      </div>
      <div style="padding:24px">
        <p style="color:#555;margin-top:0">Hi ${customerUser.name}, your order status has been updated.</p>
        ${trackingBlock}
        <div style="margin-top:24px;text-align:center">
          <a href="${siteUrl}/order/${orderId}" style="background:#C2185B;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">
            View Order Details
          </a>
        </div>
      </div>
      <div style="background:#fdf2f6;padding:16px 24px;text-align:center;font-size:12px;color:#aaa">
        &copy; Lumina Cosmetics
      </div>
    </div>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: customerUser.email,
      subject: `Your order #${shortId} is now: ${label}`,
      html,
    }),
  });
}
