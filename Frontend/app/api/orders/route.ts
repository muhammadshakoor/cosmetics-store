import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, toClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    } = await request.json();

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ message: 'No order items' }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        address: shippingAddress.address,
        city: shippingAddress.city,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
        paymentMethod,
        itemsPrice,
        taxPrice,
        shippingPrice,
        totalPrice,
        orderItems: {
          create: orderItems.map((item: {
            name: string; qty: number; image: string; price: number; _id: string;
          }) => ({
            name: item.name,
            qty: item.qty,
            image: item.image,
            price: item.price,
            productId: item._id,
          })),
        },
      },
      include: { orderItems: true },
    });

    return NextResponse.json(toClient(order), { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
