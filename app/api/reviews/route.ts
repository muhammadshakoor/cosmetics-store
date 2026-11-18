import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, toClient } from '@/lib/auth';
import { VerifiedReviewInputSchema } from '@/lib/reviews';
import { commerceError } from '@/lib/commerce';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ message: 'Login to write a review' }, { status: 401 });
    const input = VerifiedReviewInputSchema.parse(await request.json());
    const { data, error } = await supabase.rpc('commerce_create_review', {
      p_actor_id: user.id, p_product_id: input.productId, p_order_id: input.orderId,
      p_rating: input.rating, p_comment: input.comment,
    });
    if (error) throw error;
    if (!data?.id) throw new Error('Review was not returned');
    return NextResponse.json(toClient(data), { status: 201 });
  } catch (error) {
    const result = commerceError(error);
    return NextResponse.json({ message: result.message }, { status: result.status });
  }
}
