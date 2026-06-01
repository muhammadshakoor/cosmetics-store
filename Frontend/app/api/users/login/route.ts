import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, toClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    const token = signToken(user.id);
    return NextResponse.json({ ...toClient(user), token });
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
