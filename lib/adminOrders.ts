import { z } from 'zod';

export const AdminOrderQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['all', 'placed', 'confirmed', 'picked_up', 'on_the_way', 'delivered', 'cancelled']).default('all'),
  search: z.string().trim().max(100).default(''),
});
