import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, toClient } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    if (order.userId !== user.id && !user.isAdmin) {
      return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
    }

    // Shape to match what the frontend expects
    const shaped = {
      ...toClient(order),
      shippingAddress: {
        address: order.address,
        city: order.city,
        postalCode: order.postalCode,
        country: order.country,
      },
      orderItems: order.orderItems.map(toClient),
    };

    return NextResponse.json(shaped);
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
