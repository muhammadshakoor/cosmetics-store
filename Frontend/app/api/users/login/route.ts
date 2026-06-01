import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { signToken, toClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const { data: user } = await supabase.from('User').select('*').eq('email', email).single();
    if (!user || !(await bcrypt.compare(password, user.password)))
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });

    const token = signToken(user.id);
    const { password: _, ...safe } = user;
    return NextResponse.json({ ...toClient(safe), token });
  } catch {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
