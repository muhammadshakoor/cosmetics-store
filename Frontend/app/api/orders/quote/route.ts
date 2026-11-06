import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { QuoteInputSchema } from '@/types/api';
import { commerceError, normalizeOrderItems } from '@/lib/commerce';

export async function POST(request: NextRequest) {
  try {
    const input = QuoteInputSchema.parse(await request.json());
    const { data, error } = await supabase.rpc('checkout_quote', { p_items: normalizeOrderItems(input.orderItems), p_coupon_code: input.couponCode || null });
    if (error) throw error;
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const result = commerceError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}
