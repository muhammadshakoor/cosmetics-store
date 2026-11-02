import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { signToken, toClient } from '@/lib/auth';
import { LoginInputSchema } from '@/types/api';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parseResult = LoginInputSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Invalid email or password';
      return NextResponse.json({ message: firstError }, { status: 400 });
    }

    const { email: cleanEmail, password: cleanPassword } = parseResult.data;
    const isDev = process.env.NODE_ENV !== 'production';

    // 1. Guaranteed Fallback for Admin Credentials (Development / Demo only)
    if (isDev && cleanEmail === 'admin@lumina.com' && (cleanPassword === 'admin123' || cleanPassword === 'admin')) {
      const now = new Date().toISOString();
      let adminUser: any = null;

      try {
        const passHash = await bcrypt.hash('admin123', 10);
        const { data } = await supabase
          .from('User')
          .select('*')
          .ilike('email', 'admin@lumina.com')
          .maybeSingle();

        adminUser = data;

        if (!adminUser) {
          const adminId = crypto.randomUUID();
          const { data: created } = await supabase
            .from('User')
            .insert({
              id: adminId,
              name: 'Admin User',
              email: 'admin@lumina.com',
              password: passHash,
              isAdmin: true,
              emailVerified: true,
              createdAt: now,
              updatedAt: now,
            })
            .select('*')
            .single();
          adminUser = created;
        }
      } catch (dbErr) {
        console.warn('[LOGIN API] Database offline, using local admin fallback');
      }

      const finalAdmin = adminUser || {
        id: 'admin-fallback-id',
        name: 'Admin User',
        email: 'admin@lumina.com',
        isAdmin: true,
        emailVerified: true,
      };

      const token = signToken({
        userId: finalAdmin.id,
        email: finalAdmin.email,
        name: finalAdmin.name,
        isAdmin: true,
      });
      const safeAdmin = {
        id: finalAdmin.id,
        name: finalAdmin.name,
        email: finalAdmin.email,
        isAdmin: finalAdmin.isAdmin,
        picture: finalAdmin.picture,
      };
      return NextResponse.json({ ...toClient(safeAdmin), token, isAdmin: true });
    }

    // 2. Guaranteed Fallback for Test User Credentials (Development / Demo only)
    if (isDev && cleanEmail === 'user@lumina.com' && (cleanPassword === 'user123' || cleanPassword === 'user')) {
      const now = new Date().toISOString();
      let testUser: any = null;

      try {
        const passHash = await bcrypt.hash('user123', 10);
        const { data } = await supabase
          .from('User')
          .select('*')
          .ilike('email', 'user@lumina.com')
          .maybeSingle();

        testUser = data;

        if (!testUser) {
          const userId = crypto.randomUUID();
          const { data: created } = await supabase
            .from('User')
            .insert({
              id: userId,
              name: 'Test User',
              email: 'user@lumina.com',
              password: passHash,
              isAdmin: false,
              emailVerified: true,
              createdAt: now,
              updatedAt: now,
            })
            .select('*')
            .single();
          testUser = created;
        }
      } catch (dbErr) {
        console.warn('[LOGIN API] Database offline, using local test user fallback');
      }

      const finalUser = testUser || {
        id: 'user-fallback-id',
        name: 'Test User',
        email: 'user@lumina.com',
        isAdmin: false,
        emailVerified: true,
      };

      const token = signToken({
        userId: finalUser.id,
        email: finalUser.email,
        name: finalUser.name,
        isAdmin: false,
      });
      const safeUser = {
        id: finalUser.id,
        name: finalUser.name,
        email: finalUser.email,
        isAdmin: finalUser.isAdmin,
        picture: finalUser.picture,
      };
      return NextResponse.json({ ...toClient(safeUser), token, isAdmin: false });
    }

    // 3. Standard Login for User Database
    const { data: user } = await supabase
      .from('User')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!user || !(await bcrypt.compare(cleanPassword, user.password))) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 });
    }

    // Block login if email not verified (skip check for admin accounts)
    if (!user.isAdmin && user.emailVerified === false) {
      return NextResponse.json(
        {
          message: 'Please verify your email before logging in.',
          emailNotVerified: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
    });
    const safeStandard = {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      picture: user.picture,
    };
    return NextResponse.json({ ...toClient(safeStandard), token });
  } catch (err) {
    console.error('[LOGIN API EXCEPTION]:', err);
    return NextResponse.json({ message: 'Authentication failed. Please check your credentials or try again.' }, { status: 500 });
  }
}
