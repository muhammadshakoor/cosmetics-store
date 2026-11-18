import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { getJwtSecret } from '../config/auth';

export interface AuthRequest extends Request {
  user?: { id: string; name: string; email: string; isAdmin: boolean; authVersion: number };
}

const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.headers.authorization?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }

  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || typeof decoded.userId !== 'string') {
      res.status(401).json({ message: 'Not authorized, token failed' });
      return;
    }

    const { data: user, error } = await supabase
      .from('User')
      .select('id, name, email, isAdmin, authVersion, emailVerified')
      .eq('id', decoded.userId)
      .single();

    if (error || !user || !user.emailVerified || (decoded.authVersion ?? 0) !== user.authVersion) {
      res.status(401).json({ message: 'Not authorized, user not found' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

export { protect, admin };
