import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { getJwtSecret } from '../config/auth';

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

  if (!user.emailVerified) {
    res.status(403).json({ message: 'Verify your email through the storefront before signing in.' });
    return;
  }

  const token = jwt.sign({ userId: user.id, authVersion: user.authVersion }, getJwtSecret(), { expiresIn: '30d', algorithm: 'HS256' });
  res.json({ _id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, token });
};

export const registerUser = async (_req: Request, res: Response): Promise<void> => {
  res.status(503).json({ message: 'Legacy registration is disabled. Register through the active storefront to verify your email.' });
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
