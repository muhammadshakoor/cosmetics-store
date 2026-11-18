import 'server-only';

import { cache } from 'react';
import { supabase, isSupabaseAvailable } from '@/lib/supabase';
import { filterLocalProducts, getLocalProductById } from '@/lib/localProducts';
import type { Product } from '@/types/api';
import { readAllRows } from '@/lib/pagination';

const productColumns = 'id,name,image,brand,category,description,price,countInStock,rating,numReviews,createdAt,updatedAt';

function toProduct(record: { id: string } & Omit<Product, '_id'>): Product {
  const { id, ...fields } = record;
  return { _id: id, ...fields };
}

export const getCatalog = cache(async (): Promise<Product[]> => {
  if (await isSupabaseAvailable()) {
    try {
      const data = await readAllRows((from, to) => supabase.from('Product').select(productColumns, { count: 'exact' }).order('createdAt', { ascending: false }).order('id', { ascending: false }).range(from, to));
      return data.map(toProduct);
    } catch { /* The production error or development fallback below remains explicit. */ }
  }
  if (process.env.NODE_ENV === 'production') throw new Error('The product catalog is temporarily unavailable.');
  return filterLocalProducts({}).map(toProduct);
});

export const getProduct = cache(async (id: string): Promise<Product | null> => {
  if (await isSupabaseAvailable()) {
    const { data, error } = await supabase.from('Product').select(productColumns).eq('id', id).maybeSingle();
    if (!error) return data ? toProduct(data) : null;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('The product catalog is temporarily unavailable.');
  const product = getLocalProductById(id);
  return product ? toProduct(product) : null;
});

