'use client';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { toFa } from '@/utils/toFa';
import { comma } from '@/utils/format';   // ← فقط یک‌بار

export default function CartBar() {
  const { totalItems, items } = useCart();
  
  // مجموع برای «با ۱ دوست»
  const friend1Total = items.reduce((sum, item: any) => {
    const solo = item?.solo_price ?? item?.market_price ?? (item?.base_price ? item.base_price * 2 : 0);
    const f1   = item?.friend_1_price ?? Math.round(solo / 2);
    return sum + f1 * (item?.quantity ?? 1);
  }, 0);

  // Return null AFTER all hooks have been called
  if (totalItems === 0) return null;

  return (
    <div id="cartBar" className="cart-bar show">
      <span className="summary">
        <span id="cart-count">{toFa(totalItems)}</span> کالا |
        <span id="cart-total">{toFa(comma(friend1Total))}</span> تومان
      </span>

      <Link href="/cart" className="go-cart">
        برو به سبد
      </Link>
    </div>
  );
}
