'use client';
import { useContext } from 'react';
import { HomeCtx } from '@/app/page';

const CATS = [
  { key: 'all',    icon: '/img/icons/all.svg',    label: 'همه' },
  { key: 'fruit',  icon: '/img/icons/fruit.svg',  label: 'میوه' },
  { key: 'veg',    icon: '/img/icons/veg.svg',    label: 'صیفی‌جات' },
  { key: 'basket', icon: '/img/icons/basket.svg', label: 'سبد آماده' },
] as const;

export default function Categories() {
  const { cat, setCat } = useContext(HomeCtx);

  return (
    <div className="categories">
      {CATS.map(c => (
        <div
          key={c.key}
          className={`cat-item ${cat === c.key ? 'active' : ''}`}
          onClick={() => setCat(c.key as any)}
        >
          <div className="cat-icon"><img src={c.icon} alt="" /></div>
          <span>{c.label}</span>
        </div>
      ))}
    </div>
  );
}
