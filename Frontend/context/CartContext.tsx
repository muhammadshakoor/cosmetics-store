'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('cartItems');
    if (stored) setCartItems(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((x) => x.product === item.product);
      if (existing) {
        return prev.map((x) =>
          x.product === item.product ? { ...x, qty: item.qty } : x
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
