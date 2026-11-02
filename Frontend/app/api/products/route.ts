import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseAvailable } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { filterLocalProducts, addLocalProduct } from '@/lib/localProducts';
import { ProductInputSchema } from '@/types/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get('keyword') || '';
  const category = searchParams.get('category') || '';
  const limit = parseInt(searchParams.get('limit') || '0', 10);

  if (await isSupabaseAvailable()) {
    try {
      let query = supabase.from('Product').select('*').order('createdAt', { ascending: false });
      if (keyword) query = query.ilike('name', `%${keyword}%`);
      if (category) query = query.ilike('category', category);
      if (limit > 0) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      // Database returned results
      if (data) {
        return NextResponse.json(data.map(toClient));
      }
    } catch (e) {
      console.warn('[products API] Supabase query failed:', e instanceof Error ? e.message : e);
    }
  }

  // Fallback to local catalog
  const localList = filterLocalProducts({ keyword, category, limit });
  return NextResponse.json(localList.map(toClient));
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized as admin' }, { status: 401 });

    const rawBody = await request.json();
    const parseResult = ProductInputSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid product data';
      return NextResponse.json({ message: firstError }, { status: 400 });
    }

    const { name, price, image, brand, category, description, countInStock } = parseResult.data;
    const now = new Date().toISOString();
    const productId = crypto.randomUUID();

    const productPayload = {
      id: productId,
      name,
      price,
      image,
      brand,
      category,
      description,
      countInStock,
      rating: 0,
      numReviews: 0,
      userId: user.id,
      createdAt: now,
      updatedAt: now,
    };

    // Primary: Insert into Supabase
    const { data: createdProduct, error } = await supabase
      .from('Product')
      .insert(productPayload)
      .select()
      .single();

    if (error) {
      console.error('[products API] Database insert failed:', error.message);
      // Fallback in local development if Supabase table is not yet migrated
      if (process.env.NODE_ENV !== 'production') {
        const localCreated = addLocalProduct(productPayload);
        return NextResponse.json(toClient(localCreated), { status: 201 });
      }
      return NextResponse.json({ message: 'Failed to create product in database' }, { status: 500 });
    }

    return NextResponse.json(toClient(createdProduct), { status: 201 });
  } catch (e) {
    console.error('[products API] Unexpected error creating product:', e);
    return NextResponse.json({ message: 'Server error creating product' }, { status: 500 });
  }
}

