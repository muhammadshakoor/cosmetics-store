import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { RESET_TOKEN_PREFIX } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();
    if (!token?.startsWith(RESET_TOKEN_PREFIX))
      return NextResponse.json({ message: 'This reset link is invalid.' }, { status: 400 });
    if (!password || password.length < 6)
      return NextResponse.json({ message: 'Password must be at least 6 characters.' }, { status: 400 });

    const { data: user } = await supabase
      .from('User')
      .select('id, verifyTokenExpiry')
      .eq('verifyToken', token)
      .single();

    if (!user)
      return NextResponse.json({ message: 'This reset link is invalid or has already been used.' }, { status: 400 });
    if (user.verifyTokenExpiry && new Date(user.verifyTokenExpiry) < new Date())
      return NextResponse.json({ expired: true, message: 'This reset link has expired. Please request a new one.' }, { status: 400 });

    const { error } = await supabase.from('User').update({
      password: await bcrypt.hash(password, 10),
      // Following the emailed link proves the customer owns the inbox
      emailVerified: true,
      verifyToken: null,
      verifyTokenExpiry: null,
      updatedAt: new Date().toISOString(),
    }).eq('id', user.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ message: 'Password updated. You can now sign in.' });
  } catch {
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
