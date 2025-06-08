'use client';

import { useState, useEffect, useRef, MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
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
function ProductModalInner() {
  const router  = useRouter();
  const { open } = useSheet();
  const {
    items,
    addItem,
    updateQuantity,
    removeItem,
  } = useCart();
  const { product, visible, close } = useProductModal();

  /* تعداد فعلی کالا در سبد */
  const cartItem = product ? items.find(i => i.id === product.id) : undefined;
  const qty      = cartItem?.quantity ?? 0;

  const [more, setMore]     = useState(false);
  const [fav,  setFav ]     = useState(false);
  const [showToast, setShowToast] = useState(false);
  const toastTimer = useRef<NodeJS.Timeout>();

  /* علاقه‌مندی از localStorage */
  useEffect(() => {
    if (!product) return;
    setFav(localStorage.getItem(`fav-${product.id}`) === '1');
  }, [product?.id]);

  /* Toast علاقه‌مندی */
  useEffect(() => {
    if (fav) {
      setShowToast(true);
      const t = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [fav]);

  /* جمع کل آیتم‌های سبد */
  const allCnt = items.reduce((s, i) => s + i.quantity, 0);

  /* اگر هنوز محصولی انتخاب نشده است */
  if (!product) {
    return visible ? <div className={styles.overlay} onClick={close} /> : null;
  }

  /* قیمت‌های محاسبه‌ای */
  const price60 = Math.round(product.price * 0.6);
  const price30 = Math.round(product.price * 0.3);
  const seeds   = [1, 2, 3, 4, 5].map(n => product.id * 70 + n);

  /* ─── هندلرهای تعداد ─── */
  const inc = (e?: MouseEvent) => {
    e?.stopPropagation();
    if (!cartItem) {
      addItem({
        id:         product.id,
        name:       product.name,
        base_price: product.price,
        quantity:   1,
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

          <div className={styles.leftBtns}>
            <button className={styles.iconBtn} onClick={() => open('share')}>
              <FontAwesomeIcon icon={faShareNodes} />
            </button>

            <button
              className={`${styles.iconBtn} ${fav ? styles.fav : ''}`}
              onClick={() => setFav(f => !f)}
            >
              <FontAwesomeIcon icon={fav ? faHeartSolid : faHeartRegular} />
            </button>
          </div>
        </header>

        {/* اسلایدر */}
        <LightboxProvider>
          <ImageSlider seeds={seeds} />
        </LightboxProvider>

        {/* بدنهٔ مودال */}
        <article className={styles.body}>
          <h1 className={styles.title}>{product.name}</h1>

          <div className={styles.meta}>
            <span>{product.weight}</span>
            <span>
              <FontAwesomeIcon icon={faStar} color="#ffb700" />{' '}
              {product.star}{' '}
              <small>({toFa(product.sales)} فروش)</small>
            </span>
          </div>

          {/* قیمت‌ها */}
          <div className={styles.pricing}>
            <div>
              <span>خرید تنها:</span>
              <span className={styles.price}>
                {toFa(comma(product.price * 2))} تومان
              </span>
            </div>
            <div>
              <span>با ۱ دوست:</span>
              <span className={styles.price}>
                {toFa(comma(product.price))} تومان
              </span>
            </div>

            {more && (
              <>
                <div>
                  <span>با ۲ دوست:</span>
                  <span className={styles.price}>
                    {toFa(comma(price60))} تومان
                  </span>
                </div>
                <div>
                  <span>با ۳ دوست:</span>
                  <span className={styles.price}>
                    {toFa(comma(price30))} تومان
                  </span>
                </div>
              </>
            )}

            <div
              className={styles.toggleRow}
              onClick={() => setMore(m => !m)}
            >
              <span>با ۴ دوست:</span>
              <span className={`${styles.price} ${styles.free}`}>رایگان!</span>
              <FontAwesomeIcon
                icon={faChevronDown}
                className={more ? styles.rotate : ''}
              />
            </div>
          </div>

          {/* قیمت برای دوست */}
          <div className={styles.friendBox}>
            <span className={styles.friendLabel}>قیمت برای دوستانت</span>
            <span className={styles.friendPrice}>
              {toFa(comma(product.price))}
            </span>
          </div>

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
          {/* کارت تجمیع */}
          <div className={styles.card} onClick={() => open('merge')}>
            <a className={styles.moreLink}>
              <FontAwesomeIcon icon={faChevronLeft} /> اطلاعات بیشتر
            </a>
            <span>امکان تجمیع سفارش و دریافت تخفیف بیشتر</span>
          </div>
          {/* بنر تعهدات */}
          <h2 className={styles.sectionTitle}>تعهدات باهم</h2>
          <div
            className={styles.bannerWrap}
            onClick={() => open('commit')}
          >
            <div className={styles.banner}>بنر</div>
            <div className={styles.banner}>بنر</div>
          </div>

          {/* کارت مرجوعی */}
          <div className={styles.returnCard} onClick={() => open('return')}>
            <span>راهنمای مرجوع کردن کالا</span>
            <FontAwesomeIcon icon={faChevronLeft} />
          </div>
          


          {/* … سایر بخش‌ها بدون تغییر … */}
        </article>
      </section>

      {/* نوار اکشن پایین */}
      {visible && (
        <footer className={styles.actionBar}>
          {qty === 0 ? (
            <>
              <div
                className={styles.cartIcon}
                onClick={() => router.push('/cart')}
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
                onClick={() => router.push('/cart')}
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
}
