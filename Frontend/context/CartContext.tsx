'use client';

import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { createCartStore, type CartAddition } from '@/lib/cart';

export interface CartItem {
  product: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  countInStock: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => CartAddition;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  totalPrice: number;
  /** false until the saved cart has been read from localStorage */
  cartReady: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [store] = useState(() => createCartStore(() => localStorage));
  const { items: cartItems, ready: cartReady } = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  const addToCart = (item: CartItem): CartAddition => {
    if (user?.isAdmin) return { addedQty: 0, requestedQty: item.qty, reason: 'admin' };
    return store.add(item);
  };

  const removeFromCart = (id: string) =>
    store.remove(id);

  const updateQty = (id: string, qty: number) =>
    store.setQuantity(id, qty);

  const clearCart = () => store.clear();

  const itemCount = cartItems.reduce((a, c) => a + c.qty, 0);
  const totalPrice = cartItems.reduce((a, c) => a + c.price * c.qty, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQty, clearCart, itemCount, totalPrice, cartReady }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) throw new Error('useCart must be used within CartProvider');
  return context;
};
