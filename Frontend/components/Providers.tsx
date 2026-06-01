'use client';

import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { Toaster } from 'react-hot-toast';
import type { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <Toaster position="top-right" toastOptions={{ duration: 2500 }} />
        {children}
      </CartProvider>
    </AuthProvider>
  );
}
