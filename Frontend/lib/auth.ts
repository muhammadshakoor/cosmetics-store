import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { supabase, isSupabaseAvailable } from './supabase';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[auth] FATAL: Missing JWT_SECRET environment variable in production.');
    }
    console.warn('[auth] WARNING: JWT_SECRET not set, using dev fallback key. Set JWT_SECRET in .env.local');
    return 'lumina_dev_fallback_secret_never_use_in_production';
  }
  return secret;
}

export interface TokenPayload {
  userId: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  authVersion?: number;
}

export function signToken(user: TokenPayload | string) {
  const payload = typeof user === 'string' ? { userId: user } : user;
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '30d' });
}

export async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const secret = getJwtSecret();

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, secret) as TokenPayload;

    // Synthetic identities are only accepted by the development server. Never
    // infer privileges from email or replace a database user's ID.
    if (process.env.NODE_ENV === 'development' && decoded.userId === 'user-fallback-id') {
      return {
        id: 'user-fallback-id',
        name: decoded.name || 'Test User',
        email: 'user@lumina.com',
        isAdmin: false,
      };
    }
    if (process.env.NODE_ENV === 'development' && decoded.userId === 'admin-fallback-id') {
      return {
        id: 'admin-fallback-id',
        name: decoded.name || 'Admin User',
        email: 'admin@lumina.com',
        isAdmin: true,
      };
    }

    // Try Supabase database lookup only if connected
    if (await isSupabaseAvailable()) {
      try {
        const { data: user, error } = await supabase
          .from('User')
          .select('id, name, email, isAdmin, picture, authVersion')
          .eq('id', decoded.userId)
          .single();

        if (!error && user && (decoded.authVersion ?? 0) === user.authVersion) {
          return { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, picture: user.picture };
        }
      } catch (dbErr) {
        console.warn('[auth] Supabase database query failed:', dbErr instanceof Error ? dbErr.message : dbErr);
      }
    }

    return null;
  } catch (err) {
    console.error('[auth] Token verification failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export function toClient<T extends { id: string }>(obj: T) {
  const { id, ...rest } = obj;
  return { _id: id, ...rest };
}
