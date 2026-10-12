import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { getLocalProductById, updateLocalProduct, deleteLocalProduct } from '@/lib/localProducts';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { data, error } = await supabase.from('Product').select('*').eq('id', id).single();
    if (!error && data) return NextResponse.json(toClient(data));
  } catch {
    // Supabase unreachable; fall through to local store
  }

  const local = getLocalProductById(id);
  if (local) return NextResponse.json(toClient(local));
  return NextResponse.json({ message: 'Product not found' }, { status: 404 });
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
    const updatePayload = {
      name: body.name,
      price: parseFloat(body.price),
      image: body.image,
      brand: body.brand,
      category: body.category,
      description: body.description,
      countInStock: parseInt(body.countInStock),
    };

    // Update local store
    const localUpdated = updateLocalProduct(id, updatePayload);

    // Also attempt Supabase update
    try {
      const { data, error } = await supabase
        .from('Product')
        .update({
          ...updatePayload,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return NextResponse.json(toClient(data));
    } catch {
      // Ignored if Supabase is offline
    }

    if (localUpdated) return NextResponse.json(toClient(localUpdated));
    return NextResponse.json({ message: 'Product not found' }, { status: 404 });
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

    // Delete from local store
    const localDeleted = deleteLocalProduct(id);

    // Also attempt Supabase delete
    try {
      await supabase.from('Product').delete().eq('id', id);
    } catch {
      // Ignored if Supabase is offline
    }

    if (localDeleted) return NextResponse.json({ message: 'Product removed' });
    return NextResponse.json({ message: 'Product removed' });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
