'use client';
import { createContext } from 'react';

/* ---------- Context مخصوص صفحهٔ خانه ---------- */
export const HomeCtx = createContext<{
  cat:    'all' | 'fruit' | 'veg' | 'basket';
  setCat: React.Dispatch<any>;
  search: string;
  setSearch: React.Dispatch<any>;
}>(null!); 