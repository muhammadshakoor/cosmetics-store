import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const category = searchParams.get('category') || '';
    const limit = parseInt(searchParams.get('limit') || '0');

    let query = supabase.from('Product').select('*').order('createdAt', { ascending: false });
    if (keyword) query = query.ilike('name', `%${keyword}%`);
    if (category) query = query.ilike('category', category);
    if (limit > 0) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json((data || []).map(toClient));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });

    const body = await request.json();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('Product')
      .insert({
        id: crypto.randomUUID(),
        name: body.name, price: parseFloat(body.price),
        image: body.image, brand: body.brand, category: body.category,
        description: body.description, countInStock: parseInt(body.countInStock),
        rating: 0, numReviews: 0, userId: user.id,
        createdAt: now, updatedAt: now,
      })
      .select().single();

    if (error) throw new Error(error.message);
    return NextResponse.json(toClient(data), { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
