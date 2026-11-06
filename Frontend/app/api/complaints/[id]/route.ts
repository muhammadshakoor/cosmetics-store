import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';
import { updateLocalComplaintStatus } from '@/lib/localComplaints';
import { ComplaintStatusSchema } from '@/lib/complaints';
import { rateLimit } from '@/lib/rateLimit';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
    const limited = await rateLimit(request, 'complaint-status', 60, 60);
    if (limited) return limited;
    const { id } = await params;
    const parsed = z.object({ status: ComplaintStatusSchema }).safeParse(await request.json());
    if (!id || id.length > 120 || !parsed.success) return NextResponse.json({ message: 'Invalid complaint or status.' }, { status: 400 });
    const { status } = parsed.data;
    if (process.env.NODE_ENV === 'development') {
      const local = updateLocalComplaintStatus(id, status);
      if (local) return NextResponse.json(local);
    }
    const { data, error } = await supabase.from('Complaint').update({ status, updatedAt: new Date().toISOString() }).eq('id', id).select().maybeSingle();
    if (error) return NextResponse.json({ message: 'The complaint could not be updated. Please try again.' }, { status: 503 });
    if (!data) return NextResponse.json({ message: 'Complaint not found.' }, { status: 404 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ message: 'The complaint could not be updated. Please try again.' }, { status: 503 });
  }
}
