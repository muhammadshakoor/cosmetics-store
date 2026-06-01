import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, toClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const orders = await prisma.order.findMany({
      where: { userId: user.id },
      include: { orderItems: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders.map(toClient));
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
