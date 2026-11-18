import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, toClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
  return NextResponse.json(toClient(user));
}
