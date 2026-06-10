import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { supabase } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET!;

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
      .select('id, name, email, isAdmin')
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
