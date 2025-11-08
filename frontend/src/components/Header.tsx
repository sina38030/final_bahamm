'use client';
import { useEffect, useState } from 'react';
import Categories from './Categories';
import SearchButton from '@/components/common/SearchButton';

/**
 * هدر جستجو + دسته‌ها با هیسترزیس:
 *   ▸ وقتی جمع نشده و ScrollY > 140 → جمع شود
 *   ▸ وقتی جمع شده و ScrollY <  80  → باز شود
 * این فاصلهٔ 60px مانع لرزشِ رفت‌وبرگشتی می‌شود.
 */
export default function Header() {
  const [compact, setCompact] = useState(false);

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
          <SearchButton placeholder="چیو دوست داری رایگان داشته باشی؟" />
        </div>
        <Categories />
      </div>
    </header>
  );
}
