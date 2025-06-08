'use client';
import { useEffect, useRef, useState, useContext } from 'react';
import { Product, PRODUCTS } from '@/data/products';
import ProductCard from './ProductCard';
import { HomeCtx } from '@/app/page';

/**
 * Grid محصولات با اینفینیت اسکرول و فیلتر دسته + جستجو
 */
export default function ProductGrid({
  cat,
}: {
  cat: 'all' | 'fruit' | 'veg' | 'basket';
}) {
  const { search } = useContext(HomeCtx);

  /* فهرست نهایی پس از فیلتر */
  const [list, setList] = useState<Product[]>([]);

  /* مقدار بعدی که باید رندر شود */
  const [cursor, setCursor] = useState(0);

  /* نگهبان اینفینیت اسکرول */
  const guardRef = useRef<HTMLDivElement>(null);

  const BATCH = 2; // تعداد هر بار لود

  /* اعمال فیلتر دسته و جستجو */
  useEffect(() => {
    const base =
      cat === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.cat === cat);
    const filtered = search
      ? base.filter((p) => p.name.includes(search))
      : base;
    setList(filtered);
    setCursor(0); // ریست صفحه‌بندی
  }, [cat, search]);

  /* اینفینیت اسکرول */
  useEffect(() => {
    const guard = guardRef.current;
    if (!guard) return;

    const io = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting) {
          setCursor((c) => c + BATCH);
        }
      },
      { rootMargin: '0px 0px 200px 0px' }
    );
    io.observe(guard);
    return () => io.disconnect();
  }, [list]);

  const slice = list.slice(0, cursor + BATCH);

  return (
    <>
      <main id="productGrid" className="products">
        {slice.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </main>

      {/* نگهبان لود */}
      <div id="product-loader" className="observer" ref={guardRef} />
    </>
  );
}
