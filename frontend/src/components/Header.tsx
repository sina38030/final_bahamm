'use client';
import { useEffect, useState, ChangeEvent, useContext } from 'react';
import Categories from './Categories';
import { HomeCtx } from '@/contexts/HomeContext';

/**
 * هدر جستجو + دسته‌ها با هیسترزیس:
 *   ▸ وقتی جمع نشده و ScrollY > 140 → جمع شود
 *   ▸ وقتی جمع شده و ScrollY <  80  → باز شود
 * این فاصلهٔ 60px مانع لرزشِ رفت‌وبرگشتی می‌شود.
 */
export default function Header() {
  const [compact, setCompact] = useState(false);
  const { setSearch } = useContext(HomeCtx);

  useEffect(() => {
    const onScroll = () =>
      setCompact(prev => {
        const y = window.scrollY;
        if (!prev && y > 140) return true;   // جمع شود
        if ( prev && y <  80) return false;  // باز شود
        return prev;                         // تغییری نکند
      });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header id="mainHeader" className={compact ? 'compact' : ''}>
      <div className="top-card">
        <div className="search-box">
          <input
            type="text"
            placeholder="چیو دوست داری رایگان داشته باشی؟"
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
        <Categories />
      </div>
    </header>
  );
}
