import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { signToken, toClient } from '@/lib/auth';
import { LoginInputSchema } from '@/types/api';
import { rateLimit } from '@/lib/rateLimit';

interface LoginUser {
  id: string;
  name: string;
  email: string;
  password: string;
  isAdmin: boolean;
  emailVerified: boolean;
  picture?: string;
  authVersion: number;
}

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'login', 20, 600);
    if (limited) return limited;
    const parsed = LoginInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message || 'Invalid email or password' }, { status: 400 });
    }
    const { email, password } = parsed.data;
    const { data, error } = await supabase.from('User')
      .select('id, name, email, password, isAdmin, emailVerified, picture, authVersion')
      .eq('email', email).maybeSingle();
    const user = data as LoginUser | null;

    // Offline demo credentials never override a real account's password or role.
    if (!user && process.env.NODE_ENV === 'development') {
      const isAdmin = email === 'admin@lumina.com' && password === 'admin123';
      const isCustomer = email === 'user@lumina.com' && password === 'user123';
      if (isAdmin || isCustomer) {
        const demo = { id: isAdmin ? 'admin-fallback-id' : 'user-fallback-id', name: isAdmin ? 'Admin User' : 'Test User', email, isAdmin };
        return NextResponse.json({ ...toClient(demo), token: signToken({ userId: demo.id, authVersion: 0 }) });
      }
    }
    if (error) {
      console.error('[login] Account lookup failed:', error.code);
      return NextResponse.json({ message: 'Sign-in is temporarily unavailable. Please try again later.' }, { status: 503 });
    }
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }
    if (!user.isAdmin && !user.emailVerified) {
      return NextResponse.json({ message: 'Please verify your email before logging in.', emailNotVerified: true, email: user.email }, { status: 403 });
    }
    const token = signToken({ userId: user.id, authVersion: user.authVersion });
    const profile = { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, picture: user.picture };
    return NextResponse.json({ ...toClient(profile), token });
  } catch (error) {
    console.error('[login] Sign-in failed:', error instanceof Error ? error.name : 'Unknown error');
    return NextResponse.json({ message: 'Sign-in is temporarily unavailable. Please try again later.' }, { status: 500 });
  }
}
