import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user?.isAdmin) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });

  const { id } = await params;
  const { status } = await request.json();

  const VALID = ['open', 'in_progress', 'resolved'];
  if (!VALID.includes(status)) {
    return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('Complaint')
    .update({ status, updatedAt: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}
