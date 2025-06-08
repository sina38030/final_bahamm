'use client';                       // مهم: این کامپوننت کاملاً کلاینت است
import { ReactNode }   from 'react';
import { CartProvider } from '@/contexts/CartContext';

export default function Providers({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
