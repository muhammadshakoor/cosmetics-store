'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

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
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  // Don't persist until the stored cart has been read, otherwise the initial
  // empty state overwrites it (and Strict Mode's double-run then reads back []).
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cartItems');
      if (stored) setCartItems(JSON.parse(stored));
    } catch { /* corrupt storage — start with an empty cart */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems, hydrated]);

  const addToCart = (item: CartItem) => {
    if (user?.isAdmin) {
      toast.error('Admin accounts cannot add items to cart.');
      return;
    }
    setCartItems((prev) => {
      const existing = prev.find((x) => x.product === item.product);
      if (existing) {
        // Adding an item that's already in the cart increases its quantity, capped at stock
        const qty = Math.min(existing.qty + item.qty, item.countInStock || existing.countInStock);
        return prev.map((x) =>
          x.product === item.product ? { ...x, qty, countInStock: item.countInStock } : x
        );
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) =>
    setCartItems((prev) => prev.filter((x) => x.product !== id));

  const updateQty = (id: string, qty: number) =>
    setCartItems((prev) =>
      prev.map((x) => (x.product === id ? { ...x, qty } : x))
    );

  const clearCart = () => setCartItems([]);

  const itemCount = cartItems.reduce((a, c) => a + c.qty, 0);
  const totalPrice = cartItems.reduce((a, c) => a + c.price * c.qty, 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQty, clearCart, itemCount, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) throw new Error('useCart must be used within CartProvider');
  return context;
};
