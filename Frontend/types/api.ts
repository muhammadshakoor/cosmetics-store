import { z } from 'zod';

// ============================================================================
// Core Enums & Statuses
// ============================================================================
export type OrderStatus = 'placed' | 'confirmed' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
export type ProductCategory = 'skincare' | 'soaps' | 'bodycare' | 'haircare' | 'fragrance' | 'makeup';

// ============================================================================
// Database & Client Models
// ============================================================================
export interface User {
  _id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  token?: string;
  picture?: string;
  emailVerified?: boolean;
  createdAt?: string;
}

export interface Product {
  _id: string;
  name: string;
  image: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  countInStock: number;
  rating: number;
  numReviews: number;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  id?: string;
  _id?: string;
  productId?: string;
  name: string;
  qty: number;
  image: string;
  price: number;
}

export interface ShippingAddress {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface Order {
  _id: string;
  userId?: string;
  user?: { name: string; email: string };
  orderItems: OrderItem[];
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  shippingAddress?: ShippingAddress;
  paymentMethod: string;
  itemsPrice: number;
  taxPrice: number;
  shippingPrice: number;
  totalPrice: number;
  discountAmount?: number;
  couponCode?: string | null;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  isCancelled?: boolean;
  cancelledAt?: string;
  status: OrderStatus;
  trackingNumber?: string;
  courierService?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Review {
  _id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Coupon {
  _id: string;
  code: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  minOrderValue?: number;
  expiresAt?: string;
  isActive: boolean;
}

export interface Complaint {
  _id: string;
  orderId?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  subject: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved';
  adminReply?: string;
  createdAt: string;
}

// ============================================================================
// Zod Request Validation Schemas
// ============================================================================
export const RegisterInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(50),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

export const LoginInputSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const ProductInputSchema = z.object({
  name: z.string().trim().min(3, 'Product name must be at least 3 characters'),
  price: z.coerce.number().positive('Price must be greater than 0'),
  image: z.string().trim().min(1, 'Product image is required'),
  brand: z.string().trim().min(2, 'Brand must be at least 2 characters'),
  category: z.string().trim().min(2, 'Category is required'),
  description: z.string().trim().min(10, 'Description must be at least 10 characters'),
  countInStock: z.coerce.number().int().nonnegative('Stock count must be 0 or greater'),
});

export const OrderItemSchema = z.object({
  productId: z.string().trim().min(1).max(128).optional(),
  _id: z.string().optional(),
  id: z.string().optional(),
  product: z.string().optional(),
  qty: z.number().int().min(1, 'Quantity must be at least 1').max(999),
}).transform((item, ctx) => {
  const productId = (item.productId || item._id || item.product || item.id || '').trim();
  if (!productId || productId.length > 128) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A valid product ID is required' });
    return z.NEVER;
  }
  return { productId, qty: item.qty };
});

export const QuoteInputSchema = z.object({
  orderItems: z.array(OrderItemSchema).min(1, 'Order must contain at least one item').max(100),
  couponCode: z.string().trim().max(64).transform(value => value.toUpperCase()).nullable().optional(),
});

export const CreateOrderInputSchema = QuoteInputSchema.extend({
  shippingAddress: z.object({
    address: z.string().trim().min(5, 'Address is too short').max(300),
    city: z.string().trim().min(2, 'City is required').max(100),
    postalCode: z.string().trim().regex(/^\d{5}$/, 'Enter a valid 5-digit postal code'),
    country: z.literal('Pakistan'),
  }),
  phone: z.string().trim().regex(/^(?:\+?92|0)3\d{9}$/, 'Enter a valid Pakistani mobile number'),
  paymentMethod: z.literal('Cash on Delivery (COD)'),
  expectedTotalPrice: z.number().finite().nonnegative().optional(),
});

export const ReviewInputSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(3, 'Review comment must be at least 3 characters').max(500),
});

