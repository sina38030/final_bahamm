'use client';

import React from 'react';
import Link from 'next/link';
import { FaShoppingCart } from 'react-icons/fa';
import { useCart } from '../store/CartContext';
import { usePathname } from 'next/navigation';

export default function CartBottomNav() {
  const { totalItems, totalPrice } = useCart();
  const pathname = usePathname();

  // Don't show the cart navigation if there are no items or if on the cart page
  if (totalItems === 0 || pathname === '/cart') {
    return null;
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 bg-white border-t shadow-lg p-3 flex items-center justify-between z-50">
      <Link 
        href="/cart" 
        className="flex items-center justify-center bg-primary text-white px-4 py-2 rounded-lg flex-shrink-0"
      >
        <FaShoppingCart className="ml-2" />
        <span>برو به سبد</span>
      </Link>
      
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold">{totalItems}</span>
          <span className="text-sm">کالا</span>
          <span className="text-sm mx-1">|</span>
          <span className="text-sm font-bold text-primary">{totalPrice.toLocaleString('fa-IR')}</span>
          <span className="text-sm">تومان</span>
        </div>
      </div>
    </div>
  );
} 