'use client';
import { createContext, useState } from 'react';

import Header       from '@/components/Header';
import Slider       from '@/components/Slider';
import ProductGrid  from '@/components/ProductGrid';
import CartBar      from '@/components/CartBar';
import BottomNav    from '@/components/BottomNav';
import ProductModal from '@/components/ProductModal';
import { ProductModalProvider } from '@/hooks/useProductModal';
import { toFa } from '@/utils/toFa';



/* ---------- Context مخصوص صفحهٔ خانه ---------- */
export const HomeCtx = createContext<{
  cat:    'all' | 'fruit' | 'veg' | 'basket';
  setCat: React.Dispatch<any>;
  search: string;
  setSearch: React.Dispatch<any>;
}>(null!);

export default function Home() {
  /* تب فعال */
  const [cat, setCat] = useState<'all' | 'fruit' | 'veg' | 'basket'>('all');
  /* متن جست‌وجو */
  const [search, setSearch] = useState('');

  return (
    <ProductModalProvider>
      <HomeCtx.Provider value={{ cat, setCat, search, setSearch }}>
        {/* ───────── عناصر اصلی صفحه ───────── */}
        <Header />
        <Slider />
        <ProductGrid cat={cat} />
        <CartBar />
        <BottomNav />

        {/* ───────── مودال محصول ───────── */}
        <ProductModal />
      </HomeCtx.Provider>
    </ProductModalProvider>
  );
}
