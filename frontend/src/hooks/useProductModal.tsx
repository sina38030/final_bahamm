'use client';
import { createContext, useContext, useState } from 'react';
import { Product } from '@/data/products';

type ModalCtx = {
  open: (p: Product, opts?: { hideActions?: boolean }) => void;
  close: () => void;
  product: Product | null;
  visible: boolean;
  hideActions: boolean;
};

const Ctx = createContext<ModalCtx>(null!);

export function ProductModalProvider({ children }: { children: React.ReactNode }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [hideActions, setHideActions] = useState(false);
  const open  = (p: Product, opts?: { hideActions?: boolean }) => {
    setHideActions(!!opts?.hideActions);
    setProduct(p);
  };
  const close = () => { setProduct(null); setHideActions(false); };

  return (
    <Ctx.Provider value={{ open, close, product, visible: !!product, hideActions }}>
      {children}
    </Ctx.Provider>
  );
}

export const useProductModal = () => useContext(Ctx);
