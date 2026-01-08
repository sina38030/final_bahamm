'use client';

import { useState, useEffect, useRef, MouseEvent, memo, useMemo } from 'react';

// Global counter to ensure unique keys
let modalKeyCounter = 10000;
import { useRouter } from 'next/navigation';
import { safeStorage } from '@/utils/safeStorage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faPlus           as faPlusSolid,
  faMinus          as faMinusSolid,
  faChevronDown,
  faHeart          as faHeartRegular,
  faHeart          as faHeartSolid,
  faStarHalfStroke,
  faChevronLeft,
  faBasketShopping,
  faShareNodes,
} from '@fortawesome/free-solid-svg-icons';

import { useProductModal } from '@/hooks/useProductModal';
import { useCart }         from '@/contexts/CartContext';
import { toFa, comma }     from '@/utils/format';
import apiClient           from '@/utils/apiClient';

import ImageSlider          from './ImageSlider';
import { LightboxProvider } from './Lightbox';
import StickyHeader         from './StickyHeader';

import {
  BottomSheetProvider,
  useSheet,
} from './sheets/BottomSheet';

import ShareSheet from './sheets/ShareSheet';
import styles     from './styles.module.css';

/* ───────────────────── بیرونی (Provider) ───────────────────── */
export default function ProductModalOuter() {
  return (
    <BottomSheetProvider>
      <ProductModalInner />
      <ShareSheet />
    </BottomSheetProvider>
  );
}

/* ───────────────────── کامپوننت اصلی ───────────────────── */
const ProductModalInner = memo(function ProductModalInner() {
  const router  = useRouter();
  const { open } = useSheet();
  const {
    items,
    addItem,
    updateQuantity,
    removeItem,
  } = useCart();
  const { product, visible, close, hideActions } = useProductModal();
  const scrollYRef = useRef(0);
  const didMountRef = useRef(false);

  useEffect(() => {
    // Skip the initial render
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (visible) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const yFromBody = -parseInt(document.body.style.top || '0', 10) || scrollYRef.current || 0;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      // Simplified scroll restoration - removed nested requestAnimationFrame calls
      setTimeout(() => {
        window.scrollTo(0, yFromBody);
      }, 0);
    }
  }, [visible]);

  /* تعداد فعلی کالا در سبد */
  const cartItem = product ? items.find(i => i.id === product.id) : undefined;
  const qty      = cartItem?.quantity ?? 0;

  const [fav,  setFav ]     = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const reviewsAnchorRef = useRef<HTMLDivElement | null>(null);

  const scrollToReviews = () => {
    try {
      reviewsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {}
  };

  type Review = {
    id: number;
    user_id: number;
    product_id: number;
    rating: number;
    comment?: string;
    created_at?: string;
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  /* علاقه‌مندی از localStorage */
  useEffect(() => {
    if (!product) return;
    setFav(safeStorage.getItem(`fav-${product.id}`) === '1');
  }, [product?.id]);

  /* Toast علاقه‌مندی */
  useEffect(() => {
    if (fav) {
      setShowToast(true);
      const t = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [fav]);

  /* دریافت نظرات محصول */
  useEffect(() => {
    let aborted = false;
    async function loadReviews() {
      if (!product?.id || !visible) return;
      try {
        setLoadingReviews(true);
        const res = await apiClient.get(`/product/${product.id}/reviews`);
        if (!res.ok) throw new Error('failed to load reviews');
        const json = await res.json();
        if (!aborted) setReviews(Array.isArray(json) ? json : []);
      } catch {
        if (!aborted) setReviews([]);
      } finally {
        if (!aborted) setLoadingReviews(false);
      }
    }
    loadReviews();
    return () => { aborted = true; };
  }, [product?.id, visible]);

  const totalReviews = reviews.length;
  const averageRatingNum = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / totalReviews
    : 0;
  const averageRating = averageRatingNum.toFixed(1);
  const countsByStarDesc = [5, 4, 3, 2, 1].map(star => reviews.filter(r => Number(r.rating) === star).length);
  const percentagesByStarDesc = countsByStarDesc.map(c => totalReviews ? Math.round((c / totalReviews) * 100) : 0);

  /* جمع کل آیتم‌های سبد */
  const allCnt = items.reduce((s, i) => s + i.quantity, 0);

  const formatWeightDisplay = (p: any): string => {
    // Prefer explicit grams fields if available (from admin-backed products)
    const wGrams = p?.weight_grams != null ? Number(p.weight_grams) : NaN;
    const tGrams = p?.weight_tolerance_grams != null ? Number(p.weight_tolerance_grams) : undefined;
    const build = (w: number, t?: number) => {
      const base = w < 1000 ? `${toFa(w)} گرم` : `${toFa((w / 1000).toFixed(1))} کیلوگرم`;
      if (t == null || Number.isNaN(t)) return base;
      const tol = t < 1000 ? `${toFa(t)} گرم` : `${toFa((t / 1000).toFixed(1))} کیلوگرم`;
      return `${base} ± ${tol}`;
    };

    if (!Number.isNaN(wGrams) && wGrams > 0) {
      return build(wGrams, tGrams);
    }

    // Fallback: weight might be a number (grams) with optional `weight_tolerance`
    if (typeof p?.weight === 'number' && p.weight > 0) {
      const tol = typeof p?.weight_tolerance === 'number' ? p.weight_tolerance : undefined;
      return build(Number(p.weight), tol);
    }

    // Or a preformatted string like "۱ کیلوگرم ± ۱۰۰ گرم"
    if (typeof p?.weight === 'string' && p.weight.trim()) return p.weight;
    return '';
  };

  // Format sales with step rounding and plus sign
  const formatSalesDisplay = (sales: string | number): string => {
    const numeric = typeof sales === 'number'
      ? Math.max(0, Math.floor(sales))
      : Math.max(0, parseInt(String(sales).replace(/[^\d]/g, '')) || 0);
    const step = numeric < 10000 ? 100 : 1000;
    const rounded = Math.floor(numeric / step) * step;
    return `+${toFa(rounded)}`;
  };

  /* اگر هنوز محصولی انتخاب نشده است */
  if (!product) {
    return visible ? <div className={styles.overlay} onClick={close} /> : null;
  }

  /* Simple price options - no dynamic generation to avoid key conflicts */
  interface PriceOption {
    key: string;
    label: string;
    price: number;
    isFree: boolean;
  }
  
  const soloPrice = Number((product as any).solo_price ?? (product as any).market_price ?? product.price ?? 0);
  const friend1Price = Number((product as any).friend_1_price ?? (product as any).base_price ?? product.price ?? Math.round(soloPrice / 2) ?? 0);
  const friend2Price = Number((product as any).friend_2_price ?? 0) || Math.floor(soloPrice / 4) || 0;

  const priceOptions: PriceOption[] = [
    {
      key: `modal-${product.id}-solo`,
      label: 'خرید به تنهایی',
      price: soloPrice,
      isFree: false
    },
    {
      key: `modal-${product.id}-f1`,
      label: 'خرید با ۱ دوست',
      price: friend1Price,
      isFree: false
    },
    {
      key: `modal-${product.id}-f2`,
      label: 'خرید با ۲ دوست',
      price: friend2Price,
      isFree: false
    },
    {
      key: `modal-${product.id}-f3`,
      label: 'خرید با ۳ دوست',
      price: 0,
      isFree: true
    }
  ];
  // Prefer product images provided by admin; fall back to empty array
  const productImages: string[] = Array.isArray((product as any).images) ? (product as any).images : [];
  const seeds = [1, 2, 3, 4, 5].map(n => product.id * 70 + n);

  /* ─── هندلرهای تعداد ─── */
  const inc = (e?: MouseEvent) => {
    e?.stopPropagation();
    if (!cartItem) {
      addItem({
        id: product.id,
        name: product.name,
        base_price: product.price,
        market_price: (product as any).market_price,
        // Admin price fields
        solo_price: (product as any).solo_price,
        friend_1_price: (product as any).friend_1_price,
        friend_2_price: (product as any).friend_2_price,
        friend_3_price: (product as any).friend_3_price,
        image: typeof product.img === 'string' ? product.img : product.img?.toString(),
        quantity: 1,
      });
    } else {
      updateQuantity(product.id, cartItem.quantity + 1);
    }
  };

  const dec = (e?: MouseEvent) => {
    e?.stopPropagation();
    if (!cartItem) return;
    if (cartItem.quantity > 1) {
      updateQuantity(product.id, cartItem.quantity - 1);
    } else {
      removeItem(product.id);
    }
  };

  /* ───────────────────── JSX ───────────────────── */
  return (
    <>
      {/* لایهٔ تیرهٔ پشت مودال */}
      {visible && <div className={styles.overlay} onClick={close} />}

      {/* هدر چسبان */}
      <StickyHeader close={close} />

      <section className={`${styles.modal} ${visible ? styles.show : ''}`}>
        {/* Toast علاقه‌مندی */}
        <div className={`${styles.toast} ${showToast ? styles.show : ''}`}>
          این محصول به علاقه‌مندی‌ها اضافه شد
        </div>

        {/* نوار بالای تصویر */}
        <header className={styles.topBar}>
          <button className={styles.iconBtn} onClick={close}>
            &times;
          </button>

        </header>

        {/* اسلایدر */}
        <LightboxProvider>
          <ImageSlider seeds={seeds} productImages={productImages} />
        </LightboxProvider>

        {/* بدنهٔ مودال */}
        <article className={styles.body}>
          <h1 className={styles.title}>{product.name}</h1>
          {formatWeightDisplay(product) && (
            <div className={styles.weight}>{formatWeightDisplay(product)}</div>
          )}

          <div className={styles.meta} onClick={scrollToReviews} style={{ cursor: 'pointer' }}>
            <span>
              <FontAwesomeIcon icon={faStar} color="#ffb700" />{' '}
              {product.star}{' '}
              <small>(<span dir="ltr" style={{ display: 'inline-block' }}>{formatSalesDisplay((product as any).sales ?? 0)}</span> فروش)</small>
            </span>
          </div>

          {/* قیمت‌ها */}
          <div className={styles.pricing}>
            {hideActions ? (
              // حالت invited در landing: فقط «خرید به تنهایی» و «خرید گروهی»
              <>
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>خرید به تنهایی:</span>
                  <span className={styles.price}>
                    {toFa(comma(
                      Number((product as any).solo_price ?? (product as any).market_price ?? product.price ?? 0)
                    ))} تومان
                  </span>
                </div>
                <div className={styles.priceRow}>
                  <span className={styles.priceLabel}>خرید گروهی:</span>
                  <span className={styles.price}>
                    {toFa(comma(
                      Number((product as any).friend_1_price ?? (product as any).base_price ?? product.price ?? 0)
                    ))} تومان
                  </span>
                </div>
              </>
            ) : (
              <>
                {/* نمایش قیمت‌های گروهی براساس تنظیمات ادمین */}
                {priceOptions.map((option) => (
                  <div key={option.key} className={styles.priceRow}>
                    <span className={styles.priceLabel}>{option.label}:</span>
                    <span className={`${styles.price} ${option.isFree ? styles.free : ''}`}>
                      {option.isFree ? 'رایگان!' : `${toFa(comma(option.price))} تومان`}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* قیمت برای دوست - مخفی برای invited (landing) */}
          {!hideActions && (
            <div className={styles.friendBox} onClick={() => open('friend')} style={{ cursor: 'pointer' }}>
              <span className={styles.friendLabel}>قیمت برای دوستانت</span>
              <span className={styles.friendPrice}>
                {(product as any).friend_1_price ? 
                  toFa(comma((product as any).friend_1_price)) : 
                  toFa(comma(product.price))
                }
              </span>
            </div>
          )}

          {/* کارت ارسال */}
          <div className={styles.card} onClick={() => open('ship')}>
            <div className={styles.row}>
              <span>هزینه ارسال:</span>
              <span className={styles.green}>رایگان</span>
            </div>
            <div className={styles.row}>
              <span>زمان ارسال:</span>
              <span className={styles.green}>۱ روز کاری</span>
            </div>
          </div>
          {/* بنر تعهدات - موقتاً مخفی شده */}
          {/* <h2 className={styles.sectionTitle}>تعهدات باهم</h2>
          <div
            className={styles.bannerWrap}
            onClick={() => open('commit')}
          >
            <div className={styles.banner}>بنر</div>
            <div className={styles.banner}>بنر</div>
          </div> */}

          {/* کارت مرجوعی */}
          <div className={styles.returnCard} onClick={() => open('return')}>
            <span>راهنمای مرجوع کردن کالا</span>
            <FontAwesomeIcon icon={faChevronLeft} />
          </div>
          
          {/* لنگر اسکرول برای نظرات */}
          <div ref={reviewsAnchorRef} />
          {/* نظرات کاربران */}
          <h2 className={styles.sectionTitle}>نظرات کاربران</h2>
          <div className={styles.ratingCard}>
            <div className={styles.ratingHead}>
              <h3>امتیاز کاربران</h3>
              <span className={styles.total}>{loadingReviews ? 'در حال بارگذاری…' : `${toFa(totalReviews)} نظر`}</span>
            </div>
            <div className={styles.ratingMain}>
              <div className={styles.ratingScore}>{toFa(averageRating)}</div>
              <div className={styles.starGroup}>
                {[1,2,3,4,5].map(i => (
                  <FontAwesomeIcon
                    key={i}
                    icon={faStar}
                    style={{ color: i <= Math.round(averageRatingNum) ? '#ffb700' : '#e5e7eb' }}
                  />
                ))}
              </div>
            </div>
            <div>
              {[5,4,3,2,1].map((star, idx) => (
                <div key={star} style={{ display:'flex', alignItems:'center', gap:8, margin:'6px 0' }}>
                  <span style={{ fontSize:12, color:'#666', width:12, textAlign:'center' }}>{toFa(star)}</span>
                  <div style={{ flex:1, height:8, background:'#eee', borderRadius:999 }}>
                    <div style={{ width: `${percentagesByStarDesc[idx]}%`, height:8, background:'#ffb700', borderRadius:999 }} />
                  </div>
                  <span style={{ fontSize:12, color:'#999', width:28, textAlign:'center' }}>{toFa(countsByStarDesc[idx])}</span>
                </div>
              ))}
            </div>
          </div>

          {reviews.map(r => (
            <div className={styles.commentCard} key={r.id}>
              <header>
                <span className={styles.user}>
                  {r.display_name && String(r.display_name).trim()
                    ? String(r.display_name).trim()
                    : ((r.first_name || r.last_name)
                        ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
                        : 'کاربر')}
                </span>
                <span>{r.created_at ? new Date(r.created_at).toLocaleDateString('fa-IR') : ''}</span>
              </header>
              <div className={styles.starGroup}>
                {[1,2,3,4,5].map(i => (
                  <FontAwesomeIcon
                    key={i}
                    icon={faStar}
                    style={{ color: i <= (Number(r.rating) || 0) ? '#ffb700' : '#e5e7eb' }}
                  />
                ))}
              </div>
              {r.comment ? <p>{r.comment}</p> : null}
            </div>
          ))}


          {/* … سایر بخش‌ها بدون تغییر … */}
        </article>
      </section>

      {/* نوار اکشن پایین */}
      {visible && !hideActions && (
        <footer className={styles.actionBar}>
          {qty === 0 ? (
            <>
              <div
                className={styles.cartIcon}
                onClick={() => {
                  close();
                  router.push('/cart');
                }}
              >
                <FontAwesomeIcon icon={faBasketShopping} />
                {allCnt > 0 && (
                  <span className={styles.badge}>{toFa(allCnt)}</span>
                )}
              </div>

              <button className={styles.addBtn} onClick={inc}>
                + افزودن به سبد
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.viewCart}
                onClick={() => {
                  close();
                  router.push('/cart');
                }}
              >
                <FontAwesomeIcon icon={faBasketShopping} /> دیدن سبد
                <span className={styles.badge}>{toFa(allCnt)}</span>
              </button>

              <div className={styles.qtyWrap}>
                <button onClick={inc}>
                  <FontAwesomeIcon icon={faPlusSolid} />
                </button>
                <span>{toFa(qty)}</span>
                <button onClick={dec}>
                  <FontAwesomeIcon icon={faMinusSolid} />
                </button>
              </div>
            </>
          )}
        </footer>
      )}
    </>
  );
});
