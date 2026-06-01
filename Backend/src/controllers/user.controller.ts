import { Request, Response } from 'express';
import User from '../models/user.model';
import generateToken from '../utils/generateToken';
import jwt from 'jsonwebtoken';

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
export const authUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (user && (await (user as any).matchPassword(password))) {
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token,
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
     res.status(400).json({ message: 'User already exists' });
     return;
  }

  const user = await User.create({
    name,
    email,
    password,
  });

  if (user) {
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'secret123', { expiresIn: '30d' });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      token,
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req: any, res: Response): Promise<void> => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};
