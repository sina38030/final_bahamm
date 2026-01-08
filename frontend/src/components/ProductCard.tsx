'use client';

import { useState, MouseEvent, useEffect, useMemo, memo } from 'react';

// Global counter to ensure unique keys
let keyCounter = 0;

import { Product }         from '@/data/products';
import { toFa, comma }     from '@/utils/format';
import { useCart }         from '@/contexts/CartContext';
import { useProductModal } from '@/hooks/useProductModal';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faChevronDown,
  faChevronUp,
  faPlus as faPlusSolid,
  faMinus as faMinusSolid,
} from '@fortawesome/free-solid-svg-icons';

/* ─────────────────────────────── */
const ProductCard = memo(function ProductCard({ p }: { p: Product }) {
  /* سبد خرید */
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const cartItem = items.find(i => i.id === p.id);
  const qty      = cartItem?.quantity ?? 0;

  /* مودال محصول */
  const { open } = useProductModal();

  /* نمایش قیمت‌های اضافی */
  const [showAllPrices, setShowAllPrices] = useState(false);
  const [animateExtra, setAnimateExtra] = useState(false);

  // Handle animation timing
  useEffect(() => {
    if (showAllPrices) {
      // Small delay to allow display:flex to take effect first
      const timer = setTimeout(() => setAnimateExtra(true), 10);
      return () => clearTimeout(timer);
    } else {
      setAnimateExtra(false);
    }
  }, [showAllPrices]);

  const stop = (e: MouseEvent) => e.stopPropagation();

  /* +۱ */
  const plus = (e: MouseEvent) => {
    stop(e);
    if (!cartItem) {
      addItem({
        id: p.id,
        name: p.name,
        base_price: p.price,
        market_price: (p as any).market_price,
        // Admin price fields
        solo_price: (p as any).solo_price,
        friend_1_price: (p as any).friend_1_price,
        friend_2_price: (p as any).friend_2_price,
        friend_3_price: (p as any).friend_3_price,
        image: typeof p.img === 'string' ? p.img : '',
        quantity: 1,
      });
    } else {
      updateQuantity(p.id, cartItem.quantity + 1);
    }
  };

  /* −۱ */
  const minus = (e: MouseEvent) => {
    stop(e);
    if (cartItem && cartItem.quantity > 1) {
      updateQuantity(p.id, cartItem.quantity - 1);
    } else {
      removeItem(p.id);
    }
  };

  // Helper function to format weight in Persian (grams input)
  const formatWeight = (weightGrams: string | number, tolGrams?: number) => {
    const w = typeof weightGrams === 'string' ? parseFloat(weightGrams || '0') : Number(weightGrams || 0);
    const t = typeof tolGrams === 'number' ? tolGrams : undefined;
    const base = w < 1000 ? `${toFa(w)} گرم` : `${toFa((w / 1000).toFixed(1))} کیلوگرم`;
    if (t == null || isNaN(t)) return base;
    const tol = t < 1000 ? `${toFa(t)} گرم` : `${toFa((t / 1000).toFixed(1))} کیلوگرم`;
    return `${base} ± ${tol}`;
  };

  // Helper function to format rating in Persian
  const formatRating = (rating: string | number) => {
    if (typeof rating === 'string') return rating;
    return toFa(rating.toFixed(1));
  };

  // Helper function to format sales with step rounding and plus sign
  const formatSales = (sales: string | number) => {
    const numeric = typeof sales === 'number'
      ? Math.max(0, Math.floor(sales))
      : Math.max(0, parseInt(String(sales).replace(/[^\d]/g, '')) || 0);
    const step = numeric < 10000 ? 100 : 1000;
    const rounded = Math.floor(numeric / step) * step;
    return `+${toFa(rounded)}`;
  };

  // Define price option interface
  interface PriceOption {
    key: string;
    label: string;
    price: number;
    isFree: boolean;
    isDefault: boolean;
  }

  // Build four price options: تنها, با ۱ دوست, با ۲ دوست, با ۳ دوست (رایگان)
  const individualPrice = (p as any).solo_price ?? p.price;
  const friend1 = (p as any).friend_1_price ?? null;
  const friend2 = (p as any).friend_2_price ?? null;
  const priceOptions: PriceOption[] = [
    {
      key: `product-${p.id}-solo`,
      label: 'تنها',
      price: Number(individualPrice || 0),
      isFree: false,
      isDefault: false
    },
    {
      key: `product-${p.id}-f1`,
      label: 'با ۱ دوست',
      price: Number(friend1 ?? 0),
      isFree: false,
      isDefault: true
    },
    {
      key: `product-${p.id}-f2`,
      label: 'با ۲ دوست',
      price: Number(friend2 ?? 0),
      isFree: false,
      isDefault: false
    },
    {
      key: `product-${p.id}-f3`,
      label: 'با ۳ دوست',
      price: 0,
      isFree: true,
      isDefault: false
    }
  ];
  
  // When closed: show only first and last options
  // When open: show all options
  // Collapsed: show only "با 1 دوست" and "با 3 دوست: رایگان!"
  const visibleOptions = showAllPrices ? priceOptions : [
    priceOptions[1], // با 1 دوست
    priceOptions[priceOptions.length - 1] // با 3 دوست (free)
  ];

  const hasQty = qty > 0;

  /* ───────────── JSX ───────────── */
  return (
    <div className="product">
      {/* تصویر محصول ـ کلیک روی آن مودال را باز می‌کند */}
      <div
        className="prod-img"
        onClick={() => open(p)}
        style={{ cursor: 'pointer' }}
      >
        {typeof p.img === 'string' && p.img ? (
          <img
            src={p.img}
            alt={p.name}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : null}

        {/* افزودن یا جعبهٔ کم/زیاد */}
        {!hasQty ? (
          <button className="add-btn" onClick={plus}>
            + افزودن
          </button>
        ) : (
          <div className="qty-box visible" onClick={stop}>
            <button className="plus" onClick={plus}>
              <FontAwesomeIcon icon={faPlusSolid} className="iconXs" />
            </button>
            <span className="count">{toFa(qty)}</span>
            <button className="minus" onClick={minus}>
              <FontAwesomeIcon icon={faMinusSolid} className="iconXs" />
            </button>
          </div>
        )}
      </div>

      {/* نام و مشخصات */}
      <h3 className="name">{p.name}</h3>
      <p className="weight">
        {formatWeight(p.weight || 0, (p as any).weight_tolerance)}
      </p>

      {/* امتیاز */}
      <div className="rating">
        <FontAwesomeIcon icon={faStar} style={{ color: '#ffbf00' }} />
        <span className="score">
          {formatRating(p.star || 0)}
        </span>
        <span className="sales">
          (<span dir="ltr" style={{ display: 'inline-block' }}>{formatSales(p.sales || 0)}</span> فروش)
        </span>
      </div>

      {/* قیمت‌های گروهی */}
      <div 
        className={`prices ${showAllPrices ? 'open' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setShowAllPrices(!showAllPrices);
        }}
        style={{ cursor: 'pointer' }}
      >
        {/* قیمت‌های پیش‌فرض (با ۱ دوست و رایگان) - حذف خرید تنهایی */}
        {visibleOptions.map((option, index) => (
          <div key={option.key} className="price-line">
            <span className="label">{option.label}:</span>
            <span className="value">
              {option.isFree ? (
                <span className="free">
                  رایگان!
                </span>
              ) : (
                `${toFa(comma(option.price))} تومان`
              )}
              {/* Always render toggle chevron next to free option */}
              {option.isFree && (
                <FontAwesomeIcon 
                  icon={showAllPrices ? faChevronUp : faChevronDown}
                  style={{ 
                    marginRight: '6px', 
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                />
              )}
            </span>
          </div>
        ))}


      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render if these props change
  return (
    prevProps.p.id === nextProps.p.id &&
    prevProps.p.name === nextProps.p.name &&
    prevProps.p.price === nextProps.p.price &&
    prevProps.p.img === nextProps.p.img &&
    (prevProps.p as any).solo_price === (nextProps.p as any).solo_price &&
    (prevProps.p as any).friend_1_price === (nextProps.p as any).friend_1_price &&
    (prevProps.p as any).friend_2_price === (nextProps.p as any).friend_2_price &&
    (prevProps.p as any).friend_3_price === (nextProps.p as any).friend_3_price
  );
});

export default ProductCard;
