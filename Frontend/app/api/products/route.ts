import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, toClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '0');

    const products = await prisma.product.findMany({
      where: {
        ...(keyword && { name: { contains: keyword, mode: 'insensitive' } }),
        ...(category && { category: { equals: category, mode: 'insensitive' } }),
      },
      orderBy: { createdAt: 'desc' },
      ...(limit > 0 && { take: limit }),
    });

    return NextResponse.json(products.map(toClient));
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });

    const { name, price, image, brand, category, description, countInStock } = await request.json();

    const product = await prisma.product.create({
      data: {
        name, price: parseFloat(price), image, brand, category,
        description, countInStock: parseInt(countInStock),
        userId: user.id,
      },
    });

    return NextResponse.json(toClient(product), { status: 201 });
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
