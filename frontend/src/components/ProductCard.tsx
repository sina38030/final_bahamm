'use client';

import { useState, MouseEvent } from 'react';

import { Product }         from '@/data/products';
import { toFa, comma }     from '@/utils/format';
import { useCart }         from '@/contexts/CartContext';
import { useProductModal } from '@/hooks/useProductModal';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStar,
  faChevronDown,
  faPlus as faPlusSolid,
  faMinus as faMinusSolid,
} from '@fortawesome/free-solid-svg-icons';

/* ─────────────────────────────── */
export default function ProductCard({ p }: { p: Product }) {
  /* سبد خرید */
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const cartItem = items.find(i => i.id === p.id);
  const qty      = cartItem?.quantity ?? 0;

  /* مودال محصول */
  const { open } = useProductModal();

  /* قیمت‌های گروهی */
  const price60 = Math.round(p.price * 0.6);
  const price30 = Math.round(p.price * 0.3);

  /* باز/بستن لیست قیمت */
  const [showList, setShowList] = useState(false);

  const stop = (e: MouseEvent) => e.stopPropagation();

  /* +۱ */
  const plus = (e: MouseEvent) => {
    stop(e);
    if (!cartItem) {
      addItem({
        id:        p.id,
        name:      p.name,
        base_price:p.price,
        quantity:  1,
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

  const togglePrices = (e: MouseEvent) => {
    stop(e);
    setShowList(s => !s);
  };

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
        <img src={`https://picsum.photos/seed/${p.img}/500`} alt={p.name} />

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
      <p  className="weight">{p.weight}</p>

      {/* امتیاز */}
      <div className="rating">
        <FontAwesomeIcon icon={faStar} style={{ color: '#ffbf00' }} />
        <span className="score">{p.star}</span>
        <span className="sales">{toFa(p.sales)} فروش</span>
      </div>

      {/* قیمت‌ها */}
      <div className={`prices ${showList ? 'open' : ''}`}>
        <div className="price-line">
          <span className="label">با ۱ دوست:</span>
          <span className="value">{toFa(comma(p.price))} تومان</span>
        </div>

        {showList && (
          <>
            <div className="price-line extra-price">
              <span className="label">با ۲ دوست:</span>
              <span className="value">{toFa(comma(price60))} تومان</span>
            </div>

            <div className="price-line extra-price">
              <span className="label">با ۳ دوست:</span>
              <span className="value">{toFa(comma(price30))} تومان</span>
            </div>
          </>
        )}

        <div className="price-line toggle-row" onClick={togglePrices}>
          <span className="label">با ۴ دوست:</span>
          <span className="value free">رایگان!</span>
          <FontAwesomeIcon
            icon={faChevronDown}
            className={`price-toggle${showList ? ' rot180' : ''}`}
          />
        </div>
      </div>
    </div>
  );
}
