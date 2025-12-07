'use client';
import { useEffect, useRef, useState, useContext } from 'react';
import { Product } from '@/data/products';

// 타입 داخلی برای گرید که شامل نام دستهٔ متنی هم باشد
type GridProduct = Product & { category?: string };
import ProductCard from './ProductCard';
import { HomeCtx } from '@/contexts/HomeContext';
import { useCart } from '@/contexts/CartContext';
import { API_BASE_URL } from '@/utils/api';

/**
 * Grid محصولات با اینفینیت اسکرول و فیلتر دسته + جستجو
 */
export default function ProductGrid({
  cat,
  initialProductsRaw = [],
}: {
  cat: 'all' | string;
  initialProductsRaw?: any[];
}) {
  const { search } = useContext(HomeCtx);
  const { totalItems } = useCart();

  /* فهرست نهایی پس از فیلتر */
  const [list, setList] = useState<GridProduct[]>([]);
  
  /* فهرست کامل محصولات (با سید اولیه از سرور) */
  const [allProducts, setAllProducts] = useState<GridProduct[]>(initialProductsRaw as GridProduct[]);

  /* مقدار بعدی که باید رندر شود */
  const [cursor, setCursor] = useState(0);

  /* نگهبان اینفینیت اسکرول */
  const guardRef = useRef<HTMLDivElement>(null);

  const BATCH = 12; // تعداد هر بار لود برای رندر تدریجی (کلاینت)

  /* دریافت همهٔ محصولات از API به صورت صفحه‌ای (با فallback به مسیر عمومی) */
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const PAGE_SIZE = 20; // Further reduced for better performance
        const collected: GridProduct[] = [];

        // Helper: map backend product shape to GridProduct
        const mapProducts = (items: any[]): GridProduct[] =>
          items.map((bp: any) => ({
            id: bp.id,
            name: bp.name,
            price: bp.solo_price || bp.market_price || bp.base_price,
            base_price: bp.base_price,
            market_price: bp.market_price,
            solo_price: bp.solo_price,
            friend_1_price: bp.friend_1_price,
            friend_2_price: bp.friend_2_price,
            friend_3_price: bp.friend_3_price,
            cat: bp.category?.toLowerCase().includes('میوه') ? 'fruit' :
                 bp.category?.toLowerCase().includes('سبزی') ? 'veg' :
                 bp.category?.toLowerCase().includes('الکترونیک') ? 'basket' :
                 bp.category?.toLowerCase().includes('پوشاک') ? 'basket' : 'basket',
            img: Array.isArray(bp.images) && bp.images.length > 0 ? String(bp.images[0]) : (bp.image ? String(bp.image) : ''),
            images: Array.isArray(bp.images) ? bp.images : (bp.image ? [bp.image] : []),
            // Connect real fields
            weight: (bp.weight_grams ? bp.weight_grams : 0),
            weight_tolerance: (bp.weight_tolerance_grams ?? undefined),
            star: (bp.display_rating ?? 0),
            sales: (bp.display_sales ?? 0),
            category: bp.category
          }));

        // 1) Try admin endpoint with skip/limit - limit to 5 pages initially
        let usedAny = false;
        let skip = 0;
        for (let i = 0; i < 2; i++) { // Reduced to 2 pages for faster initial load
          const res = await fetch(`${API_BASE_URL}/admin/products?limit=${PAGE_SIZE}&skip=${skip}`);
          if (!res.ok) break;
          const items: any[] = await res.json();
          if (!items?.length) break;
          const mapped = mapProducts(items);
          collected.push(...mapped);
          usedAny = true;
          skip += PAGE_SIZE;
          if (items.length < PAGE_SIZE) break;
        }

        // 2) Fallback to public products endpoint (page/limit) if admin returned nothing
        if (!usedAny) {
          for (let page = 1; page <= 2; page++) { // Reduced to 2 pages for faster initial load
            const res = await fetch(`${API_BASE_URL}/products?page=${page}&limit=${PAGE_SIZE}`);
            if (!res.ok) break;
            const items: any[] = await res.json();
            if (!items?.length) break;
            const mapped = mapProducts(items);
            collected.push(...mapped);
            if (items.length < PAGE_SIZE) break;
          }
        }

        // اگر قبلا سید اولیه داریم، جمع آوری پس‌زمینه را به آن اضافه کن
        if (collected.length) {
          setAllProducts((prev) => {
            if (!prev?.length) return collected;
            const seen = new Set(prev.map(p => p.id));
            const merged = [...prev, ...collected.filter(p => !seen.has(p.id))];
            return merged;
          });
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback to empty array if API fails
        if (!allProducts.length) setAllProducts([]);
      }
    };
    // اگر سید اولیه نداریم، فچ فوری انجام بده؛ در غیر اینصورت در پس‌زمینه تکمیل کن
    if (!initialProductsRaw?.length) {
      fetchProducts();
    } else {
      // پس‌زمینه، بدون بلاک کردن رندر اولیه
      setTimeout(fetchProducts, 0);
    }
  }, []);

  /* اعمال فیلتر دسته و جستجو (با درنظرگرفتن نام دستهٔ متنی از بک‌اند) */
  useEffect(() => {
    let base = allProducts;
    if (cat !== 'all') {
      base = allProducts.filter((p) => {
        const catStr = (p.category || '').trim().toLowerCase();
        const target = String(cat).trim().toLowerCase();
        return catStr === target;
      });
    }
    
    const filtered = search
      ? base.filter((p) => p.name.includes(search))
      : base;
    
    setList(filtered);
    setCursor(0); // ریست صفحه‌بندی
  }, [cat, search, allProducts]);

  /* اینفینیت اسکرول - only activate for larger product lists */
  useEffect(() => {
    const guard = guardRef.current;
    if (!guard) return;
    
    // Don't use infinite scroll for small product lists
    if (list.length <= 20) {
      console.log('Skipping infinite scroll setup - product list is small enough to show all');
      return;
    }

    // Check if IntersectionObserver is available (missing on some Android WebViews)
    if (typeof IntersectionObserver === 'undefined') {
      console.log('IntersectionObserver not available - showing all products');
      setCursor(list.length);
      return;
    }

    const io = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting) {
          console.log('Infinite scroll triggered, loading more products');
          setCursor((c) => {
            console.log('Cursor updated from', c, 'to', c + BATCH);
            return c + BATCH;
          });
        }
      },
      { rootMargin: '0px 0px 200px 0px' }
    );
    io.observe(guard);
    return () => io.disconnect();
  }, [list]);

  // For small product lists, show all products immediately to avoid scroll issues
  const shouldShowAll = list.length <= 20; // Show all if 20 or fewer products
  const slice = shouldShowAll ? list : list.slice(0, cursor + BATCH);
  
  console.log(`ProductGrid: Showing ${slice.length} of ${list.length} products${shouldShowAll ? ' (showing all)' : ''}`);

  return (
    <>
      <main id="productGrid" className="products">
        {slice.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </main>

      {/* نگهبان لود - only show for larger product lists */}
      {!shouldShowAll && (
        <div id="product-loader" className="observer" ref={guardRef} />
      )}

      {/* فاصله انتهایی برای نوار سبد خرید */}
      {totalItems > 0 && (
        <div aria-hidden style={{ height: 120 }} />
      )}
    </>
  );
}
