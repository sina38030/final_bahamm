'use client';
import { useState } from 'react';
import { Product } from '@/data/products';
import { toFa, comma } from '@/utils/format';
import { useCart } from '@/contexts/CartContext';

export default function ProductCard({ p }: { p: Product }) {
  const { addItem, removeItem } = useCart();
  const [qty, setQty] = useState(0);
  const [openPrices, setOpenPrices] = useState(false);

  const inc = () => { 
    setQty(q => q + 1); 
    addItem({
      id: p.id,
      name: p.name,
      base_price: p.price,
      image: typeof p.img === 'string' ? p.img : '',
      quantity: 1,
    });
  };
  const dec = () => {
    if (qty === 1) { 
      setQty(0); 
      removeItem(p.id); 
    }
    else { 
      setQty(q => q - 1); 
      removeItem(p.id); 
    }
  };

  return (
    <div className="product">
      <div className="prod-img">
        <img src={`https://picsum.photos/500?random=${p.img}`} alt="" />
        {qty === 0 ? (
          <button className="add-btn" onClick={inc}>+ افزودن</button>
        ) : (
          <div className="qty-box">
            <button className="plus"  onClick={inc}>+</button>
            <span  className="count">{toFa(qty)}</span>
            <button className="minus" onClick={dec}>−</button>
          </div>
        )}
      </div>

      <h3 className="name">{p.name}</h3>
      <p  className="weight">{p.weight}</p>

      <div className="rating">
        <i className="fas fa-star" />
        <span className="score">{p.star}</span>
        <span className="sales">{toFa(p.sales)} فروش</span>
      </div>

      <div className={`prices ${openPrices ? 'open' : ''}`}>
        <div className="price-line">
          <span className="label">با ۱ دوست:</span>
          <span className="value">{toFa(comma(p.price))} تومان</span>
        </div>
        <div className="price-line extra-price">
          <span className="label">با ۲ دوست:</span>
          <span className="value">{toFa(comma(Math.round(p.price * 0.6)))} تومان</span>
        </div>
        <div className="price-line extra-price">
          <span className="label">با ۳ دوست:</span>
          <span className="value">{toFa(comma(Math.round(p.price * 0.3)))} تومان</span>
        </div>
        <div className="price-line" onClick={() => setOpenPrices(!openPrices)}>
          <span className="label">با ۴ دوست:</span>
          <span className="value free">رایگان!</span>
          <i className="fas fa-chevron-down price-toggle" />
        </div>
      </div>
    </div>
  );
}
