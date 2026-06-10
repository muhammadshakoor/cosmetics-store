import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const addOrderItems = async (req: any, res: Response): Promise<void> => {
  const { orderItems, shippingAddress, paymentMethod, itemsPrice, taxPrice, shippingPrice, totalPrice } = req.body;

  if (!orderItems?.length) { res.status(400).json({ message: 'No order items' }); return; }

  const orderId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { data: order, error: orderError } = await supabase
    .from('Order')
    .insert({
      id: orderId,
      userId: req.user.id,
      address: shippingAddress.address,
      city: shippingAddress.city,
      postalCode: shippingAddress.postalCode,
      country: shippingAddress.country,
      paymentMethod,
      itemsPrice, taxPrice, shippingPrice, totalPrice,
      isPaid: false, isDelivered: false, isCancelled: false,
      status: 'confirmed', discountAmount: 0,
      createdAt: now, updatedAt: now,
    })
    .select().single();

  if (orderError) { res.status(400).json({ message: orderError.message }); return; }

  const items = orderItems.map((item: any) => ({
    id: crypto.randomUUID(),
    orderId,
    productId: item._id || item.id,
    name: item.name, qty: item.qty, image: item.image, price: item.price,
  }));

  const { error: itemsError } = await supabase.from('OrderItem').insert(items);
  if (itemsError) { res.status(400).json({ message: itemsError.message }); return; }

  const { data: created } = await supabase
    .from('Order').select('*, OrderItem(*)').eq('id', orderId).single();

  res.status(201).json(created);
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  const { data: order, error } = await supabase
    .from('Order')
    .select('*, OrderItem(*), User(id, name, email)')
    .eq('id', req.params.id)
    .single();

  if (error || !order) { res.status(404).json({ message: 'Order not found' }); return; }
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

export const getOrders = async (_req: Request, res: Response): Promise<void> => {
  const { data: orders, error } = await supabase
    .from('Order')
    .select('*, User(id, name)')
    .order('createdAt', { ascending: false });

  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json(orders);
};

export const updateOrderToPaid = async (req: Request, res: Response): Promise<void> => {
  const { data: order, error: fetchError } = await supabase
    .from('Order').select('id').eq('id', req.params.id).single();

  if (fetchError || !order) { res.status(404).json({ message: 'Order not found' }); return; }

  const { data: updated, error } = await supabase
    .from('Order')
    .update({ isPaid: true, paidAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .eq('id', req.params.id)
    .select().single();

  if (error) { res.status(400).json({ message: error.message }); return; }
  res.json(updated);
};

export const updateOrderToDelivered = async (req: Request, res: Response): Promise<void> => {
  const { data: order, error: fetchError } = await supabase
    .from('Order').select('id').eq('id', req.params.id).single();

  if (fetchError || !order) { res.status(404).json({ message: 'Order not found' }); return; }

  const { data: updated, error } = await supabase
    .from('Order')
    .update({ isDelivered: true, deliveredAt: new Date().toISOString(), status: 'delivered', updatedAt: new Date().toISOString() })
    .eq('id', req.params.id)
    .select().single();

  if (error) { res.status(400).json({ message: error.message }); return; }
  res.json(updated);
};

export const cancelOrder = async (req: any, res: Response): Promise<void> => {
  const { data: order, error: fetchError } = await supabase
    .from('Order').select('*').eq('id', req.params.id).single();

  if (fetchError || !order) { res.status(404).json({ message: 'Order not found' }); return; }

  if (order.userId !== req.user.id && !req.user.isAdmin) {
    res.status(403).json({ message: 'Not authorized to cancel this order' }); return;
  }

  if (order.isDelivered) {
    res.status(400).json({ message: 'Cannot cancel an already delivered order' }); return;
  }

  const { data: updated, error } = await supabase
    .from('Order')
    .update({ isCancelled: true, cancelledAt: new Date().toISOString(), status: 'cancelled', updatedAt: new Date().toISOString() })
    .eq('id', req.params.id)
    .select().single();

  if (error) { res.status(400).json({ message: error.message }); return; }
  res.json(updated);
};
