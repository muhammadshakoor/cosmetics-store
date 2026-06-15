import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

  if (error || !code) {
    return NextResponse.redirect(`${SITE_URL}/login?error=google_cancelled`);
  }

  try {
    const redirectUri = `${SITE_URL}/api/auth/google/callback`;

    // Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    // Get Google user info
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoRes.ok) {
      throw new Error('Failed to get Google user info');
    }

    const googleUser = await userInfoRes.json();
    const { email, name } = googleUser as { email: string; name: string };

    if (!email) {
      throw new Error('Google account has no email');
    }

    const normalizedEmail = email.toLowerCase();
    const now = new Date().toISOString();

    // Find or create user
    let { data: user } = await supabase
      .from('User')
      .select('id, name, email, isAdmin')
      .eq('email', normalizedEmail)
      .single();

    if (!user) {
      const newId = crypto.randomUUID();
      const { data: created, error: createError } = await supabase
        .from('User')
        .insert({
          id: newId,
          name: name || email.split('@')[0],
          email: normalizedEmail,
          password: '',
          isAdmin: false,
          emailVerified: true,
          createdAt: now,
          updatedAt: now,
        })
        .select('id, name, email, isAdmin')
        .single();

      if (createError) throw new Error(createError.message);
      user = created;
    } else {
      // Ensure existing Google-linked users are verified
      await supabase
        .from('User')
        .update({ emailVerified: true, updatedAt: now })
        .eq('id', user.id);
    }

    if (!user) throw new Error('Failed to find or create user');

    const token = signToken(user.id);

    return NextResponse.redirect(`${SITE_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('[google-oauth]', err);
    return NextResponse.redirect(`${SITE_URL}/login?error=google_failed`);
  }
}
