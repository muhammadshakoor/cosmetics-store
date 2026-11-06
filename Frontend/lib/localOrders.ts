import fs from 'fs';
import path from 'path';

export interface LocalOrderItem {
  id: string;
  orderId: string;
  productId: string;
  name: string;
  qty: number;
  image: string;
  price: number;
}

export interface LocalOrder {
  id: string;
  userId: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone?: string | null;
  paymentMethod: string;
  itemsPrice: number;
  taxPrice: number;
  shippingPrice: number;
  totalPrice: number;
  discountAmount: number;
  couponCode?: string | null;
  isPaid: boolean;
  paidAt?: string | null;
  isDelivered: boolean;
  deliveredAt?: string | null;
  isCancelled?: boolean;
  cancelledAt?: string | null;
  status: 'placed' | 'confirmed' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';
  trackingNumber?: string | null;
  courierService?: string | null;
  createdAt: string;
  updatedAt: string;
  orderItems: LocalOrderItem[];
}

const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json');

function ensureDataFile(): LocalOrder[] {
  try {
    const dir = path.dirname(ORDERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(ORDERS_FILE)) {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf8');
      return [];
    }
    const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[localOrders] Failed to read orders file, using memory store:', err);
    return [];
  }
}

function saveOrders(orders: LocalOrder[]) {
  try {
    const dir = path.dirname(ORDERS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
  } catch (err) {
    console.warn('[localOrders] Failed to write orders file:', err);
  }
}

export function saveLocalOrder(order: LocalOrder): LocalOrder {
  const orders = ensureDataFile();
  const existingIdx = orders.findIndex((o) => o.id === order.id);
  if (existingIdx >= 0) {
    orders[existingIdx] = order;
  } else {
    orders.unshift(order);
  }
  saveOrders(orders);
  return order;
}

export function getLocalOrderById(orderId: string): LocalOrder | null {
  const orders = ensureDataFile();
  return orders.find((o) => o.id === orderId) || null;
}

export function getLocalOrdersByUserId(userId: string): LocalOrder[] {
  const orders = ensureDataFile();
  return orders.filter((o) => o.userId === userId);
}

export function getAllLocalOrders(): LocalOrder[] {
  return ensureDataFile();
}

export function updateLocalOrderStatus(
  orderId: string,
  updates: Partial<LocalOrder>
): LocalOrder | null {
  const orders = ensureDataFile();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return null;
  Object.assign(order, updates, { updatedAt: new Date().toISOString() });
  saveOrders(orders);
  return order;
}
