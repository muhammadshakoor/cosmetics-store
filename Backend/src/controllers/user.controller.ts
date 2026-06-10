import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

export const authUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const { data: user } = await supabase
    .from('User')
    .select('*')
    .eq('email', email)
    .single();

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
  res.json({ _id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, token });
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  const { data: existing } = await supabase.from('User').select('id').eq('email', email).single();
  if (existing) {
    res.status(400).json({ message: 'User already exists' });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const { data: user, error } = await supabase
    .from('User')
    .insert({ id: crypto.randomUUID(), name, email, password: hashedPassword, isAdmin: false, createdAt: now, updatedAt: now })
    .select()
    .single();

  if (error || !user) {
    res.status(400).json({ message: 'Invalid user data' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
  res.status(201).json({ _id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, token });
};

export const getUserProfile = async (req: any, res: Response): Promise<void> => {
  const { data: user } = await supabase
    .from('User')
    .select('id, name, email, isAdmin')
    .eq('id', req.user.id)
    .single();

  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return;
  }
  res.json({ _id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin });
};
