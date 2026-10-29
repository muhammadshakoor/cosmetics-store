import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { evaluateCoupon } from '@/lib/coupons';

// Validate a coupon code
export async function POST(request: NextRequest) {
  try {
    const { code, orderTotal } = await request.json();
    const result = await evaluateCoupon(code, Number(orderTotal) || 0);
    return NextResponse.json(result, { status: result.valid ? 200 : 400 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}

// Admin: get all coupons
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

    const { data, error } = await supabase.from('Coupon').select('*').order('createdAt', { ascending: false });
    if (error) throw new Error(error.message);
    return NextResponse.json((data || []).map(toClient));
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
