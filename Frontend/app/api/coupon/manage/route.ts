import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

// Admin: create coupon
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const { code, type, value, minOrder, usageLimit, expiresAt } = await request.json();

    const { data, error } = await supabase.from('Coupon').insert({
      id: crypto.randomUUID(),
      code: code.toUpperCase().trim(),
      type: type || 'percent',
      value: parseFloat(value),
      minOrder: parseFloat(minOrder || '0'),
      usageLimit: parseInt(usageLimit || '100'),
      usedCount: 0,
      isActive: true,
      expiresAt: expiresAt || null,
      createdAt: new Date().toISOString(),
    }).select().single();

    if (error) throw new Error(error.message);
    return NextResponse.json(toClient(data), { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

// Admin: toggle isActive
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const { id, isActive } = await request.json();
    const { data, error } = await supabase
      .from('Coupon')
      .update({ isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json(toClient(data));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

// Admin: delete coupon
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const { id } = await request.json();
    const { error } = await supabase.from('Coupon').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ message: 'Coupon deleted' });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
