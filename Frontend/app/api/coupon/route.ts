import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { QuoteInputSchema } from '@/types/api';
import { commerceError, normalizeOrderItems } from '@/lib/commerce';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = QuoteInputSchema.parse({ orderItems: body.orderItems, couponCode: body.code });
    if (!input.couponCode) return NextResponse.json({ message: 'Enter a coupon code' }, { status: 400 });
    const { data, error } = await supabase.rpc('checkout_quote', { p_items: normalizeOrderItems(input.orderItems), p_coupon_code: input.couponCode });
    if (error) throw error;
    return NextResponse.json({ valid: true, code: data.couponCode, type: data.couponType, value: data.couponValue, discount: data.discountAmount, message: `Coupon applied. You save Rs. ${Number(data.discountAmount).toFixed(2)}`, quote: data });
  } catch (error) {
    const result = commerceError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
    const { data, error } = await supabase.from('Coupon').select('*').order('createdAt', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data || []).map(toClient));
  } catch (error) {
    const result = commerceError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}
