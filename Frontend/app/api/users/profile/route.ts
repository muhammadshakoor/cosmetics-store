import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, toClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ message: 'Not authorized' }, { status: 401 });
  const { password: _, ...safe } = user;
  return NextResponse.json(toClient(safe));
}
