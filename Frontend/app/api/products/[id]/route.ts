import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser, toClient } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    return NextResponse.json(toClient(product));
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        price: parseFloat(body.price),
        image: body.image,
        brand: body.brand,
        category: body.category,
        description: body.description,
        countInStock: parseInt(body.countInStock),
      },
    });

    return NextResponse.json(toClient(product));
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });

    const { id } = await params;
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ message: 'Product removed' });
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
