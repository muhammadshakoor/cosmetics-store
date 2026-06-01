import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { signToken, toClient } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();
    if (!name || !email || !password)
      return NextResponse.json({ message: 'All fields are required' }, { status: 400 });

    const { data: existing } = await supabase.from('User').select('id').eq('email', email).single();
    if (existing) return NextResponse.json({ message: 'User already exists' }, { status: 400 });

    const hashed = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data: user, error } = await supabase
      .from('User')
      .insert({ id, name, email, password: hashed, isAdmin: false, createdAt: now, updatedAt: now })
      .select()
      .single();

    if (error) throw new Error(error.message);
    const token = signToken(user.id);
    const { password: _, ...safe } = user;
    return NextResponse.json({ ...toClient(safe), token }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ message: e instanceof Error ? e.message : 'Server error' }, { status: 500 });
  }
}
