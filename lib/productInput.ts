import { z } from 'zod';
import { ProductInputSchema } from '../types/api';

/** Accept bundled/uploaded paths as well as ordinary web image URLs. */
export function isProductImageSource(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//') && !/[\\\s]/.test(value)) return true;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

export const ManagedProductInputSchema = ProductInputSchema.extend({
  image: z.string().trim().max(2048).refine(isProductImageSource, 'Enter an image URL or a path beginning with /'),
  price: z.coerce.number().positive('Price must be greater than 0').max(1_000_000_000),
  countInStock: z.coerce.number().int().nonnegative('Stock count must be 0 or greater').max(2_147_483_646),
});

export const UpdateProductInputSchema = ManagedProductInputSchema.extend({
  expectedInventoryVersion: z.number().int().nonnegative(),
});
