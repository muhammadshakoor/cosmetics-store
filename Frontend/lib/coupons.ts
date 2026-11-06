import { supabase } from './supabase';

export type CouponResult =
  | { valid: true; code: string; type: string; value: number; discount: number; message: string }
  | { valid: false; message: string };

const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString()}`;

/** Server-side coupon check — the single source of truth for discounts. */
export async function evaluateCoupon(rawCode: string, orderTotal: number): Promise<CouponResult> {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { valid: false, message: 'No coupon code provided' };

  const { data: coupon, error } = await supabase
    .from('Coupon')
    .select('*')
    .eq('code', code)
    .eq('isActive', true)
    .single();

  if (error || !coupon) return { valid: false, message: 'Invalid coupon code' };
  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date())
    return { valid: false, message: 'This coupon has expired' };
  if (coupon.usedCount >= coupon.usageLimit)
    return { valid: false, message: 'This coupon has reached its usage limit' };
  if (orderTotal < coupon.minOrder)
    return { valid: false, message: `A minimum order of ${rs(coupon.minOrder)} is required for this coupon` };

  const discount = Math.round(
    coupon.type === 'percent'
      ? (orderTotal * coupon.value) / 100
      : Math.min(coupon.value, orderTotal)
  );

  return {
    valid: true,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discount,
    message: coupon.type === 'percent'
      ? `${coupon.value}% off applied — you save ${rs(discount)}!`
      : `${rs(discount)} off applied!`,
  };
}
