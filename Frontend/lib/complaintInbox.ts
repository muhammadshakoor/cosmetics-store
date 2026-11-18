import { z } from 'zod';
import { ComplaintStatusSchema } from './complaints';

export type ComplaintStatus = z.infer<typeof ComplaintStatusSchema>;
export type ComplaintFilter = ComplaintStatus | 'all';
export const complaintLabels: Record<ComplaintFilter, string> = {
  all: 'All', open: 'Open', in_progress: 'In progress', resolved: 'Resolved',
};
export const ComplaintListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['all', 'open', 'in_progress', 'resolved']).default('all'),
});
export const ComplaintRecordSchema = z.object({
  id: z.string(), userId: z.string().nullable(), name: z.string(), email: z.string(),
  orderId: z.string().nullable(), category: z.string(), subject: z.string(), message: z.string(),
  status: ComplaintStatusSchema, createdAt: z.string(), updatedAt: z.string(),
});
export type ComplaintRecord = z.infer<typeof ComplaintRecordSchema>;
export const ComplaintPageSchema = z.object({
  complaints: z.array(ComplaintRecordSchema), total: z.number().int().nonnegative(),
  page: z.number().int().positive(), pageSize: z.number().int().positive(),
  statusCounts: z.object({ open: z.number().int().nonnegative(), in_progress: z.number().int().nonnegative(), resolved: z.number().int().nonnegative() }),
});
export type ComplaintPage = z.infer<typeof ComplaintPageSchema>;

/** Also used for development-only local records; production pagination runs in the database. */
export function paginateComplaints(records: ComplaintRecord[], page: number, pageSize: number, status: ComplaintFilter): ComplaintPage {
  const sorted = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  const statusCounts = { open: 0, in_progress: 0, resolved: 0 };
  for (const complaint of sorted) statusCounts[complaint.status]++;
  const filtered = status === 'all' ? sorted : sorted.filter(complaint => complaint.status === status);
  return { complaints: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize, statusCounts };
}

export async function loadComplaintPage(token: string, page: number, status: ComplaintFilter, signal: AbortSignal): Promise<ComplaintPage> {
  const query = new URLSearchParams({ page: String(page), pageSize: '20', status });
  const response = await fetch(`/api/complaints?${query}`, { headers: { Authorization: `Bearer ${token}` }, signal, cache: 'no-store' });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Your complaints could not be loaded. Please try again.');
  const parsed = ComplaintPageSchema.safeParse(body);
  if (!parsed.success) throw new Error('Your complaints could not be loaded. Please try again.');
  return parsed.data;
}
