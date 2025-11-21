'use client';

import { useState } from 'react';

import Header from '@/components/Header';
import CartBar from '@/components/CartBar';
import { HomeCtx } from '@/contexts/HomeContext';

import Slider from '@/components/Slider';
import ProductGrid from '@/components/ProductGrid';

type Banner = {
  id: number | string;
  image_url: string;
  title?: string | null;
  description?: string | null;
};

type HomeClientProps = {
  initialProductsRaw?: any[];
  initialBanners?: Banner[];
};

export default function HomeClient({ initialProductsRaw = [], initialBanners = [] }: HomeClientProps) {
  const [cat, setCat] = useState<'all' | string>('all');
  const [search, setSearch] = useState('');

  return (
      <HomeCtx.Provider value={{ cat, setCat, search, setSearch }}>
        <Header />

        <Slider initialBanners={initialBanners} />

        <ProductGrid cat={cat} initialProductsRaw={initialProductsRaw} />

        <CartBar />
      </HomeCtx.Provider>
  );
}


