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

// Catalog reads remain available, but the retired API cannot bypass storefront inventory rules.
const productChangesUnavailable = async (_req: Request, res: Response): Promise<void> => {
  res.status(503).json({ message: 'Manage products through /admin on the storefront.' });
};

export const createProduct = productChangesUnavailable;
export const updateProduct = productChangesUnavailable;
export const deleteProduct = productChangesUnavailable;
