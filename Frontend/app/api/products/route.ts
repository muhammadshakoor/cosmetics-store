import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { filterLocalProducts, addLocalProduct } from '@/lib/localProducts';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const limit = parseInt(searchParams.get('limit') || '0');

  try {
    let query = supabase.from('Product').select('*').order('createdAt', { ascending: false });
    if (keyword) query = query.ilike('name', `%${keyword}%`);
    if (category) query = query.ilike('category', category);
    if (limit > 0) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (data && data.length > 0) {
      return NextResponse.json((data || []).map(toClient));
    }
  } catch (e) {
    // Supabase is offline or unconfigured; serve gracefully from local store
    console.warn('[products API] Supabase query unavailable, serving from local store:', e instanceof Error ? e.message : e);
  }

  // Graceful fallback to local store
  const localList = filterLocalProducts({ keyword, category, limit });
  return NextResponse.json(localList.map(toClient));
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });

    const body = await request.json();
    const productPayload = {
      name: body.name,
      price: parseFloat(body.price),
      image: body.image,
      brand: body.brand,
      category: body.category,
      description: body.description,
      countInStock: parseInt(body.countInStock),
      rating: 0,
      numReviews: 0,
      userId: user.id,
    };

    // Save to local store
    const localCreated = addLocalProduct(productPayload);

    // Also attempt Supabase insert if reachable
    try {
      const now = new Date().toISOString();
      await supabase.from('Product').insert({
        id: localCreated.id,
        ...productPayload,
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      // Ignored if Supabase is offline
    }

    return NextResponse.json(toClient(localCreated), { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
