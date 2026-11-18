import { z } from 'zod';

export const ComplaintStatusSchema = z.enum(['open', 'in_progress', 'resolved']);
export const ComplaintInputSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(100),
  email: z.string().trim().email('Enter a valid email address.').max(254).toLowerCase(),
  orderId: z.string().trim().max(120).nullable().optional().transform((value) => value || null),
  category: z.enum(['Wrong / Missing Item', 'Product Quality', 'Delivery Problem', 'Payment Issue', 'Return / Exchange', 'Coupon / Discount', 'Account Issue', 'Other']),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters.').max(160),
  message: z.string().trim().min(10, 'Please include at least 10 characters.').max(5000),
});

export const StoredComplaintSchema = ComplaintInputSchema.extend({
  id: z.string().min(1).max(120), userId: z.string().nullable(),
  status: ComplaintStatusSchema, createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
