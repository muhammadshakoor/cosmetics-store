import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    return NextResponse.json({ message: 'Facebook OAuth not configured' }, { status: 500 });
  }

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  const redirectUri = `${SITE_URL}/api/auth/facebook/callback`;

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: 'email,public_profile',
    response_type: 'code',
  });

  return NextResponse.redirect(
    `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
  );
}
