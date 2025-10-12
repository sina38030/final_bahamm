'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/* ---------- انواع داده ---------- */
export interface CartItem {
  id: number;
  name: string;
  base_price: number;      // قیمتِ ما
  market_price?: number;   // قیمتِ بازار (اختیاری)
  // Admin price fields
  solo_price?: number;     // خرید به تنهایی
  friend_1_price?: number; // خرید با ۱ دوست
  friend_2_price?: number; // خرید با ۲ دوست
  friend_3_price?: number; // خرید با ۳ دوست (رایگان)
  image?: string;
  quantity: number;
}

interface CartAPI {
  items: CartItem[];
  addItem: (item: CartItem, qty?: number) => void;
  removeItem: (id: number) => void;
  updateQuantity: (id: number, qty: number) => void;
  clearCart: () => void;

  totalItems: number;          // جمع تعداد
  totalBasePrice: number;      // جمع قیمت پایه
  totalMarketPrice: number;    // جمع قیمت بازار (اگر موجود)
  totalPrice: number;          // فعلاً همان base

  /* خرید گروهی */
  groupBuyOption: 0 | 1 | 2 | 3;          // 0=ویژه/رایگان، 1=۱ دوست، 2=۲ دوست، 3=تک‌نفره
  setGroupBuyOption: (opt: 0 | 1 | 2 | 3) => void;

  getSingleBuyTotal: () => number;
  getGroupBuyTotal: (friends: number) => number;
}

/* ---------- ساخت کانتکست ---------- */
const CartCtx = createContext<CartAPI | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  /* سبد خرید */
  const [items, setItems] = useState<CartItem[]>([]);

  /* حالتِ خرید گروهی: 3 = تک‌نفره (پیش‌فرض) */
  const [groupBuyOption, setGroupBuyOption] = useState<0 | 1 | 2 | 3>(3);

  /* ---------- Persist & Hydrate (localStorage) ---------- */
  useEffect(() => {
    try {
      const rawItems = localStorage.getItem('cart_items');
      if (rawItems) {
        const parsed: CartItem[] = JSON.parse(rawItems);
        if (Array.isArray(parsed)) {
          setItems(parsed.map(i => ({
            ...i,
            base_price: i.base_price ?? 0,
            market_price: i.market_price ?? i.base_price ?? 0,
            quantity: Math.max(1, Number(i.quantity) || 1),
          })));
        }
      }
      const rawGroup = localStorage.getItem('cart_group_option');
      if (rawGroup !== null) {
        const opt = parseInt(rawGroup, 10);
        if (opt === 0 || opt === 1 || opt === 2 || opt === 3) setGroupBuyOption(opt);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('cart_items', JSON.stringify(items));
    } catch {}
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem('cart_group_option', String(groupBuyOption));
    } catch {}
  }, [groupBuyOption]);

  /* ---------- توابع CRUD سبد ---------- */
  const addItem = (item: CartItem, qty: number = 1) => {
    // Ensure the item has valid price values
    const safeItem = {
      ...item,
      base_price: item.base_price ?? 0,
      market_price: item.market_price ?? item.base_price ?? 0,
      quantity: qty
    };
    
    setItems(prev => {
      const idx = prev.findIndex(p => p.id === safeItem.id);
      if (idx === -1) return [...prev, safeItem];
      const cloned = [...prev];
      cloned[idx].quantity += qty;
      return cloned;
    });
  };

  const removeItem = (id: number) => {
    setItems(prev => prev.filter(p => p.id !== id));
  };

  const updateQuantity = (id: number, qty: number) => {
    if (qty <= 0) return removeItem(id);
    setItems(prev =>
      prev.map(p => (p.id === id ? { ...p, quantity: qty } : p)),
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  /* ---------- محاسبات جمع ---------- */
  const totalItems       = items.reduce((s, i) => s + i.quantity, 0);
  const totalBasePrice   = items.reduce((s, i) => s + (i.base_price ?? 0) * i.quantity, 0);
  const totalMarketPrice = items.reduce((s, i) => s + (i.market_price ?? i.base_price ?? 0) * i.quantity, 0);
  const totalPrice       = totalBasePrice; // فعلاً

  /* ---------- منطق تخفیف گروهی ---------- */
  const getSingleBuyTotal  = () => totalBasePrice;

  /** تخفیف نمایشی: هر دوست +۱۰٪ ارزان‌تر، تا رایگان شدن */
  const getGroupBuyTotal = (friends: number) => {
    if (friends <= 0) return totalBasePrice;
    const discount = Math.min(friends * 0.10, 1);        // حداکثر ۱۰۰٪
    return Math.round(totalBasePrice * (1 - discount));
  };

  /* ---------- خروجی ---------- */
  return (
    <CartCtx.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,

        totalItems,
        totalBasePrice,
        totalMarketPrice,
        totalPrice,

        groupBuyOption,
        setGroupBuyOption,

        getSingleBuyTotal,
        getGroupBuyTotal,
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}

/* ---------- هوک مصرف ---------- */
export function useCart() {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}
