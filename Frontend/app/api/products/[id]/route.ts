import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { getLocalProductById, updateLocalProduct, deleteLocalProduct } from '@/lib/localProducts';
import { ProductInputSchema } from '@/types/api';
import { deliverRestockAlerts } from '@/lib/restock';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabase.from('Product').select('*').eq('id', id).maybeSingle();
  if (!error) return data ? NextResponse.json(toClient(data)) : NextResponse.json({ message: 'Product not found' }, { status: 404 });
  if (process.env.NODE_ENV !== 'production') {
    const local = getLocalProductById(id);
    if (local) return NextResponse.json(toClient(local));
  }
  return NextResponse.json({ message: 'The product is temporarily unavailable. Please try again.' }, { status: 503 });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });
  const parsed = ProductInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
  const { id } = await params;
  const { data, error } = await supabase.from('Product').update({ ...parsed.data, updatedAt: new Date().toISOString() }).eq('id', id).select().maybeSingle();
  if (!error && data) {
    await deliverRestockAlerts(data);
    return NextResponse.json(toClient(data));
  }
  if (!error) return NextResponse.json({ message: 'Product not found' }, { status: 404 });
  if (process.env.NODE_ENV !== 'production') {
    const local = updateLocalProduct(id, parsed.data);
    if (local) return NextResponse.json(toClient(local));
  }
  return NextResponse.json({ message: 'The product could not be saved. Please try again.' }, { status: 503 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabase.from('Product').delete().eq('id', id).select('id');
  if (error?.code === '23503') return NextResponse.json({ message: 'This product belongs to an existing order or review. Set its stock to zero to stop new purchases while preserving order history.' }, { status: 409 });
  if (error) {
    if (process.env.NODE_ENV !== 'production' && deleteLocalProduct(id)) return NextResponse.json({ message: 'Product removed' });
    return NextResponse.json({ message: 'The product could not be removed. Please try again.' }, { status: 503 });
  }
  if (!data?.length) return NextResponse.json({ message: 'Product not found' }, { status: 404 });
  return NextResponse.json({ message: 'Product removed' });
}
