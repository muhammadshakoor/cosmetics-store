import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';

// Validate a coupon code
export async function POST(request: NextRequest) {
  try {
    const { code, orderTotal } = await request.json();
    if (!code) return NextResponse.json({ message: 'No coupon code provided' }, { status: 400 });

    const { data: coupon, error } = await supabase
      .from('Coupon')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('isActive', true)
      .single();

    if (error || !coupon) return NextResponse.json({ message: 'Invalid coupon code' }, { status: 400 });

    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return NextResponse.json({ message: 'This coupon has expired' }, { status: 400 });
    }
    if (coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ message: 'This coupon has reached its usage limit' }, { status: 400 });
    }
    if (orderTotal < coupon.minOrder) {
      return NextResponse.json({
        message: `Minimum order of $${coupon.minOrder.toFixed(2)} required for this coupon`
      }, { status: 400 });
    }

    const discount = coupon.type === 'percent'
      ? (orderTotal * coupon.value) / 100
      : Math.min(coupon.value, orderTotal);

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount: parseFloat(discount.toFixed(2)),
      message: coupon.type === 'percent'
        ? `${coupon.value}% discount applied! You save $${discount.toFixed(2)}`
        : `$${coupon.value} discount applied!`,
    });
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
