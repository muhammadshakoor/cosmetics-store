import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  let query = supabase.from('Product').select('*');

  if (req.query.keyword) query = query.ilike('name', `%${req.query.keyword}%`);
  if (req.query.category) query = query.ilike('category', `%${req.query.category}%`);
  if (req.query.limit) query = query.limit(parseInt(req.query.limit as string));

  const { data: products, error } = await query;
  if (error) { res.status(500).json({ message: error.message }); return; }
  res.json(products);
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  const { data: product, error } = await supabase
    .from('Product').select('*').eq('id', req.params.id).single();

  if (error || !product) { res.status(404).json({ message: 'Product not found' }); return; }
  res.json(product);
};

export const createProduct = async (req: any, res: Response): Promise<void> => {
  const { name, price, image, brand, category, description, countInStock } = req.body;
  const now = new Date().toISOString();

  const { data: product, error } = await supabase
    .from('Product')
    .insert({
      id: crypto.randomUUID(),
      name, price, image, brand, category, description,
      countInStock: countInStock || 0,
      rating: 0, numReviews: 0,
      userId: req.user.id,
      createdAt: now, updatedAt: now,
    })
    .select().single();

  if (error || !product) { res.status(400).json({ message: error?.message || 'Failed to create product' }); return; }
  res.status(201).json(product);
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  const { name, price, image, brand, category, description, countInStock } = req.body;

  const { data: existing, error: fetchError } = await supabase
    .from('Product').select('*').eq('id', req.params.id).single();

  if (fetchError || !existing) { res.status(404).json({ message: 'Product not found' }); return; }

  const { data: product, error } = await supabase
    .from('Product')
    .update({
      name: name ?? existing.name,
      price: price ?? existing.price,
      image: image ?? existing.image,
      brand: brand ?? existing.brand,
      category: category ?? existing.category,
      description: description ?? existing.description,
      countInStock: countInStock ?? existing.countInStock,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select().single();

  if (error || !product) { res.status(400).json({ message: error?.message || 'Failed to update product' }); return; }
  res.json(product);
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  const { error: fetchError } = await supabase
    .from('Product').select('id').eq('id', req.params.id).single();

  if (fetchError) { res.status(404).json({ message: 'Product not found' }); return; }

  const { error } = await supabase.from('Product').delete().eq('id', req.params.id);
  if (error) { res.status(400).json({ message: error.message }); return; }
  res.json({ message: 'Product removed' });
};
