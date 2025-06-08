'use client';
import { createContext, useContext, useState } from 'react';
import { Product } from '@/data/products';

type ModalCtx = {
  open: (p: Product) => void;
  close: () => void;
  product: Product | null;
  visible: boolean;
};

const Ctx = createContext<ModalCtx>(null!);

export function ProductModalProvider({ children }: { children: React.ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);
  const open  = (p: Product) => { setProduct(p); };
  const close = () => setProduct(null);

  return (
    <Ctx.Provider value={{ open, close, product, visible: !!product }}>
      {children}
    </Ctx.Provider>
  );
}

export const useProductModal = () => useContext(Ctx);
