'use client';

import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { Toaster } from 'react-hot-toast';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <Toaster position="top-right" toastOptions={{ duration: 2500 }} />
          {children}
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}
