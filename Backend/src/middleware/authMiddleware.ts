import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';

interface AuthRequest extends Request {
  user?: any;
}

const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.headers.authorization?.startsWith('Bearer')) {
    res.status(401).json({ message: 'Not authorized, no token' });
    return;
  }

  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

    const { data: user } = await supabase
      .from('User')
      .select('id, name, email, isAdmin')
      .eq('id', decoded.userId)
      .single();

    if (!user) {
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
    res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

export { protect, admin };
