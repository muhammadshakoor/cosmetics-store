import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase.from('Product').select('*').eq('id', id).single();
    if (error || !data) return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    return NextResponse.json(toClient(data));
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
    const { data, error } = await supabase
      .from('Product')
      .update({
        name: body.name, price: parseFloat(body.price),
        image: body.image, brand: body.brand, category: body.category,
        description: body.description, countInStock: parseInt(body.countInStock),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id).select().single();

    if (error) throw new Error(error.message);
    return NextResponse.json(toClient(data));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
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
    const { error } = await supabase.from('Product').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ message: 'Product removed' });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
