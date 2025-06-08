'use client';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { toFa } from '@/utils/toFa';
import { comma } from '@/utils/format';   // ← فقط یک‌بار

export default function CartBar() {
  const { totalItems, totalPrice } = useCart();
  if (totalItems === 0) return null;

  return (
    <div id="cartBar" className="cart-bar show">
      <span className="summary">
        <span id="cart-count">{toFa(totalItems)}</span> کالا |
        <span id="cart-total">{toFa(comma(totalPrice))}</span> تومان
      </span>

      <Link href="/cart" className="go-cart">
        برو به سبد
      </Link>
    </div>
  );
}
