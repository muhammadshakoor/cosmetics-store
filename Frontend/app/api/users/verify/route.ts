import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signToken, toClient } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token)
    return NextResponse.json({ message: 'Verification token is missing' }, { status: 400 });

  const { data: user } = await supabase
    .from('User')
    .select('*')
    .eq('verifyToken', token)
    .single();

  if (!user)
    return NextResponse.json({ message: 'Invalid or already used verification link' }, { status: 400 });

  if (user.emailVerified)
    return NextResponse.json({ alreadyVerified: true, message: 'Email already verified' });

  if (!user.verifyTokenExpiry || new Date(user.verifyTokenExpiry) <= new Date())
    return NextResponse.json(
      { expired: true, email: user.email, message: 'Verification link has expired. Request a new one.' },
      { status: 400 }
    );

  const now = new Date().toISOString();
  const { data: verified, error } = await supabase.from('User').update({
    emailVerified: true,
    verifyToken: null,
    verifyTokenExpiry: null,
    updatedAt: now,
  }).eq('id', user.id).eq('verifyToken', token).eq('emailVerified', false).gt('verifyTokenExpiry', now).select('id, name, email, isAdmin, picture, authVersion').maybeSingle();

  if (error) return NextResponse.json({ message: 'Verification is temporarily unavailable. Please try again.' }, { status: 503 });
  if (!verified) return NextResponse.json({ message: 'Invalid or already used verification link' }, { status: 400 });

  // Return JWT so the user is logged in immediately after verifying
  const jwtToken = signToken({ userId: verified.id, authVersion: verified.authVersion });
  const safe = { id: verified.id, name: verified.name, email: verified.email, isAdmin: verified.isAdmin, picture: verified.picture };
  return NextResponse.json({ ...toClient({ ...safe, emailVerified: true }), token: jwtToken, verified: true });
}
