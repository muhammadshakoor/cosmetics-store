import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signToken, toClient, RESET_TOKEN_PREFIX } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token)
    return NextResponse.json({ message: 'Verification token is missing' }, { status: 400 });
  // Password-reset tokens live in the same column but must never log anyone in here
  if (token.startsWith(RESET_TOKEN_PREFIX))
    return NextResponse.json({ message: 'Invalid or already used verification link' }, { status: 400 });

  const { data: user } = await supabase
    .from('User')
    .select('*')
    .eq('verifyToken', token)
    .single();

  if (!user)
    return NextResponse.json({ message: 'Invalid or already used verification link' }, { status: 400 });

  if (user.emailVerified)
    return NextResponse.json({ alreadyVerified: true, message: 'Email already verified' });

  if (user.verifyTokenExpiry && new Date(user.verifyTokenExpiry) < new Date())
    return NextResponse.json(
      { expired: true, email: user.email, message: 'Verification link has expired. Request a new one.' },
      { status: 400 }
    );

  const now = new Date().toISOString();
  await supabase.from('User').update({
    emailVerified: true,
    verifyToken: null,
    verifyTokenExpiry: null,
    updatedAt: now,
  }).eq('id', user.id);

  // Return JWT so the user is logged in immediately after verifying
  const jwtToken = signToken(user.id);
  const { password: _p, verifyToken: _vt, verifyTokenExpiry: _vte, ...safe } = user;
  return NextResponse.json({ ...toClient({ ...safe, emailVerified: true }), token: jwtToken, verified: true });
}
