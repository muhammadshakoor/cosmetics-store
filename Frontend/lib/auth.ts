import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { supabase } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'lumina_cosmetics_super_secret_key_2024';

export function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export async function getAuthUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[auth] JWT_SECRET env var is not set');
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, secret) as { userId: string };

    const { data: user, error } = await supabase
      .from('User')
      .select('id, name, email, isAdmin, picture')
      .eq('id', decoded.userId)
      .single();

    if (error) {
      console.error('[auth] Supabase user lookup failed:', error.message);
      return null;
    }
    return user;
  } catch (err) {
    console.error('[auth] Token verification failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export function toClient<T extends { id: string }>(obj: T) {
  const { id, ...rest } = obj;
  return { _id: id, ...rest };
}

// Password-reset tokens share the User.verifyToken column; this prefix keeps them
// from ever being accepted as email-verification links (which log the user in).
export const RESET_TOKEN_PREFIX = 'reset_';
