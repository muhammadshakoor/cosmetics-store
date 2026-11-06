import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authCookie = request.cookies.get('lumina_auth')?.value;
  const adminCookie = request.cookies.get('lumina_admin')?.value;

  // 1. Protect Admin Routes
  if (pathname.startsWith('/admin')) {
    if (!authCookie || !adminCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // 2. Protect Customer Account & Checkout Routes
  if (pathname.startsWith('/profile') || pathname.startsWith('/checkout') || pathname.startsWith('/complaints/my')) {
    if (!authCookie) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/profile/:path*',
    '/checkout/:path*',
    '/complaints/my/:path*',
  ],
};

