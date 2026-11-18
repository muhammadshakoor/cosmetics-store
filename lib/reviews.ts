import { z } from 'zod';
import { ReviewInputSchema } from '../types/api';

export const VerifiedReviewInputSchema = ReviewInputSchema.extend({
  productId: z.string().trim().min(1).max(128),
  orderId: z.string().trim().min(1, 'Order ID is required').max(128),
});
