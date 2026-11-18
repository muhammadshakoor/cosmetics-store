import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import type { AuthRequest } from '../middleware/authMiddleware';

export const addOrderItems = async (_req: Request, res: Response): Promise<void> => {
  res.status(503).json({ message: 'Legacy checkout is disabled. Place orders through the active storefront checkout.' });
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }
  const { data: order, error } = await supabase
    .from('Order')
    .select('*, OrderItem(*), User(id, name, email)')
    .eq('id', req.params.id)
    .single();

  if (error || !order) { res.status(404).json({ message: 'Order not found' }); return; }
  if (order.userId !== req.user.id && !req.user.isAdmin) {
    res.status(403).json({ message: 'Not authorized to view this order' }); return;
  }
  res.json(order);
};

export const getMyOrders = async (req: any, res: Response): Promise<void> => {
  const { data: orders, error } = await supabase
    .from('Order')
    .select('*, OrderItem(*)')
    .eq('userId', req.user.id)
    .order('createdAt', { ascending: false });

  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json(orders);
};

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user?.isAdmin) { res.status(403).json({ message: 'Not authorized as an admin' }); return; }
  const { data: orders, error } = await supabase
    .from('Order')
    .select('*, User(id, name)')
    .order('createdAt', { ascending: false });

  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json(orders);
};

// Keep the retired API read-only: order transitions must use storefront checkout rules.
const orderChangesUnavailable = async (_req: Request, res: Response): Promise<void> => {
  res.status(503).json({ message: 'Use your order page on the storefront to manage an order, or /admin/orders for store administration.' });
};

export const updateOrderToPaid = orderChangesUnavailable;
export const updateOrderToDelivered = orderChangesUnavailable;
export const cancelOrder = orderChangesUnavailable;
