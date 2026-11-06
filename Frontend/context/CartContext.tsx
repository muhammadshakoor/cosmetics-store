'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { addCartItem, sanitizeCart, setCartQuantity } from '@/lib/cart';

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
  /** false until the saved cart has been read from localStorage */
  cartReady: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartReady, setCartReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cartItems');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is only readable after hydration
      if (stored) setCartItems(sanitizeCart(JSON.parse(stored)));
    } catch { /* corrupted storage — start with an empty cart */ }
    setCartReady(true);
  }, []);

  // Only persist once the saved cart is loaded, otherwise the initial [] overwrites it
  useEffect(() => {
    if (cartReady) {
      try { localStorage.setItem('cartItems', JSON.stringify(cartItems)); } catch { /* keep the current cart if browser storage is unavailable */ }
    }
  }, [cartItems, cartReady]);

  const addToCart = (item: CartItem) => {
    if (user?.isAdmin) {
      toast.error('Admin accounts cannot add items to cart.');
      return;
    }
    setCartItems((prev) => addCartItem(prev, item));
  };

  const removeFromCart = (id: string) =>
    setCartItems((prev) => prev.filter((x) => x.product !== id));

  const updateQty = (id: string, qty: number) =>
    setCartItems((prev) => setCartQuantity(prev, id, qty));

  const clearCart = () => setCartItems([]);

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
