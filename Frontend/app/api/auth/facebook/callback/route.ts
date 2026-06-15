import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';

  if (error || !code) {
    return NextResponse.redirect(`${SITE_URL}/login?error=facebook_cancelled`);
  }

  try {
    const redirectUri = `${SITE_URL}/api/auth/facebook/callback`;

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', process.env.FACEBOOK_APP_ID!);
    tokenUrl.searchParams.set('client_secret', process.env.FACEBOOK_APP_SECRET!);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    if (!tokenRes.ok) throw new Error('Failed to exchange code for token');
    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    // Get Facebook user info
    const userInfoRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
    );
    if (!userInfoRes.ok) throw new Error('Failed to get Facebook user info');
    const fbUser = await userInfoRes.json();

    const { name, email } = fbUser as { name: string; email?: string };

    // Facebook may not return email if user hasn't granted it or has no email
    if (!email) {
      return NextResponse.redirect(`${SITE_URL}/login?error=facebook_no_email`);
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
      await supabase
        .from('User')
        .update({ emailVerified: true, updatedAt: now })
        .eq('id', user.id);
    }

    if (!user) throw new Error('Failed to find or create user');

    const token = signToken(user.id);
    return NextResponse.redirect(`${SITE_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('[facebook-oauth]', err);
    return NextResponse.redirect(`${SITE_URL}/login?error=facebook_failed`);
  }
}
