'use client';

/*  ░░  صفحهٔ سبد خرید ـ نسخهٔ فاینال  ░░  */
/*  توضیح: منطق سبد از CartContext می‌آید؛  UI دقیقاً طبق ماکاپ   */

import { useState, useMemo, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

/* ---------------------- helpers ---------------------- */
const toFa = (val: number | string) =>
  val.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

const comma = (n: number) =>
  toFa(n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬'));

const Toman = ({ value }: { value: number }) => (
  <Fragment>
    {comma(value)} <span className="toman">تومان</span>
  </Fragment>
);

/* قیمت متغیّر محصول براساس اسلایدر دوستان */
const priceByFriends = (base: number, friend?: number, f = 1) => {
  if (f === 0) return base;
  if (f === 1) return friend ?? Math.round(base * 0.5);
  if (f === 3) return 0;
  return Math.round(base / (f + 1));
};

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, totalItems } = useCart();
  const [friends, setFriends] = useState(1); // 0 = تنها ... 3 = چهار نفر (=رایگان)

  /* جمع کل‌ها */
  const totals = useMemo(() => {
    const alone = items.reduce((s, p) => s + p.base_price * p.quantity, 0);
    const withFriend = items.reduce(
      (s, p) =>
        s + (p.friend_price ?? Math.round(p.base_price * 0.5)) * p.quantity,
      0,
    );

    let your: number;
    if (friends === 0) your = alone;
    else if (friends === 1) your = withFriend;
    else if (friends === 3) your = 0;
    else your = Math.round(alone / (friends + 1));

    return { alone, withFriend, your };
  }, [items, friends]);

  /* ---------- handlers ---------- */
  const changeQty = (id: number, delta: number, cur: number) => {
    const next = cur + delta;
    if (next <= 0) removeItem(id);
    else updateQuantity(id, next);
  };

  /* ---------- JSX ---------- */
  return (
    <>
      {/*  Header */}
      <header className="hdr">
        <button onClick={() => router.back()} className="bk" aria-label="back">
          ❮
        </button>
        <h1>سبد خرید</h1>
        <span className="count">{toFa(totalItems)} کالا</span>
      </header>

      {/*  Basket card */}
      <section className="basket">
        {items.filter((p) => p.quantity > 0).map((p) => (
          <div className="product" key={p.id}>
            <img
              src={p.img ?? `https://picsum.photos/seed/${p.id}/100/100`}
              alt={p.name}
            />

            <div className="info">
              <span className="title">{p.name}</span>
              {p.weight && <span className="weight">{p.weight}</span>}

              <div className="qty">
                <button
                  onClick={() => changeQty(p.id, -1, p.quantity)}
                  aria-label="dec"
                >
                  {p.quantity > 1 ? '-' : trashSvg}
                </button>
                <span>{toFa(p.quantity)}</span>
                <button
                  onClick={() => changeQty(p.id, 1, p.quantity)}
                  aria-label="inc"
                >
                  +
                </button>
              </div>
            </div>

            <div className="prices">
              {friends !== 0 && (
                <span className="price-num">
                  {comma(p.base_price)} <span className="toman">تومان</span>
                </span>
              )}
              <span className="price-main">
                {priceByFriends(p.base_price, p.friend_price, friends) === 0 ? (
                  'رایگان'
                ) : (
                  <Toman value={priceByFriends(p.base_price, p.friend_price, friends)} />
                )}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/*  Discount card  */}
      <section className="discount">
        <p className="text">
          وقتی{' '}
          <b className="pink">
            {friends === 0 ? '۰' : toFa(friends)} دوست
          </b>{' '}
          از دوستانت سبدت رو بخرن، مبلغ سفارشِت بجای{' '}
          <b className="pink">
            <Toman value={totals.alone} />
          </b>{' '}
          به{' '}
          <b className="pink">
            {totals.your === 0 ? 'رایگان' : <Toman value={totals.your} />}
          </b>{' '}
          کاهش پیدا میکنه.
        </p>
        {friends !== 0 && (
          <p className="sub">
            قیمت سبد برای دوستانت: <Toman value={totals.withFriend} />
          </p>
        )}

        <div className="range-wrap">
          <input
            type="range"
            min={0}
            max={3}
            step={1}
            value={friends}
            onChange={(e) => setFriends(+e.target.value)}
          />
          <span className="free-pill">رایگان</span>
        </div>
      </section>

      {/*  Explanation card  */}
      <section className="explain">explanations</section>

      {/*  footer buttons  */}
      <footer className="fbar">
        <button
          className="solo"
          onClick={() => router.push('/checkout?mode=alone')}
        >
          خرید به تنهایی<br />
          <Toman value={totals.alone} />
        </button>
        <button
          className="group"
          onClick={() => router.push('/checkout?mode=group')}
        >
          شروع خرید گروهی<br />
          {totals.your === 0 ? (
            <span className="free">رایگان</span>
          ) : (
            <Toman value={friends === 0 ? totals.withFriend : totals.your} />
          )}
        </button>
      </footer>

      {/* ========== styles ========== */}
      <style jsx>{`
        :root {
          --pink: #e31c5f;
          --bg: #fefefe;
          --txt-light: #777;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Vazirmatn', sans-serif;
          color: #333;
        }
        .toman { font-size: 7px; margin-left: 2px; }
        .hdr {
          position: sticky;
          top: 0;
          background: var(--bg);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 1rem 0 0.5rem;
        }
        .bk {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          font-size: 22px;
          color: #999;
          cursor: pointer;
        }
        .hdr h1 { font-size: 14px; font-weight: 700; }
        .hdr .count {
          position: absolute;
          left: 133px;
          top: 60%;
          transform: translateY(-50%);
          background: #ccc;
          padding: 0.08rem 0.5rem;
          border-radius: 0.3rem;
          font-size: 12px;
        }
        .basket {
          background: #fff;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          box-shadow: 0 5px 6px #0001;
          max-height: 290px;
          overflow-y: auto;
          margin: 0 1rem 1rem;
          padding: 0.5rem 0.5rem;
        }
        .product {
          display: grid;
          grid-template-columns: 72px 1fr 108px;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0;
          border-bottom: 1px solid #eee;
        }
        .product:last-child { border-bottom: none; }
        .product img {
          width: 72px;
          height: 72px;
          border-radius: 15px;
          background: #ddd;
          object-fit: cover;
        }
        .info { display: flex; flex-direction: column; gap: 0.25rem; }
        .title { font-weight: 500; font-size: 13px; }
        .weight { font-size: 11px; color: var(--txt-light); }
        .qty { display: flex; align-items: center; gap: 0.25rem; margin-top: 0.25rem; }
        .qty button {
          width: 18px; height: 18px; border: none; border-radius: 0.15rem;
          background: #eee; cursor: pointer; line-height: 0;
          display: flex; justify-content: center; align-items: center;
        }
        .prices { text-align: left; font-size: 12px; }
        .price-num { text-decoration: line-through; display: block; }
        .price-main { color: var(--pink); }
        .discount {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 5px 6px #0001;
          margin: 0 1rem 1rem;
          padding: 15px;
        }
        .text { font-size: 14px; line-height: 1.9; margin-bottom: 0.7rem; }
        .sub { font-size: 13px; color: var(--txt-light); margin-bottom: 1rem; }
        .pink { color: var(--pink); font-weight: 700; }
        .range-wrap { position: relative; }
        input[type='range'] {
          -webkit-appearance: none; width: 100%; height: 6px; border-radius: 3px;
          background: #ddd; cursor: pointer; direction: rtl;
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none; width: 22px; height: 22px; border: 4px solid #fff;
          border-radius: 50%; background: var(--pink); box-shadow: 0 2px 5px #0002;
          position: relative; z-index: 2;
        }
        .free-pill {
          position: absolute; left: 0; top: -1.4rem; transform: translateX(-40%);
          background: var(--pink); color: #fff; padding: 0.05rem 0.6rem;
          border-radius: 10px; font-size: 0.72rem; white-space: nowrap;
        }
        .explain {
          height: 160px; background: #fff; box-shadow: 0 2px 6px #0001;
          border-radius: 16px; margin: 0 1rem 120px; padding: 1rem; overflow: auto;
        }
        /* Footer */
        .fbar {
          position: fixed;
          bottom: 0;
          inset-inline: 0;
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          background: #fff;
          padding: 0.75rem 1rem;
          border-top: 1px solid #ddd;
          z-index: 10;
        }
        .fbar button {
          flex: 1;
          border: none;
          border-radius: 18px;
          padding: 0.7rem 0;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          text-align: center;
        }
        .solo {
          background: #fff;
          border: 2px solid var(--pink);
          color: #E31C5F;
        }
        .group {
          background: #E31C5F;
          color: #fff;

      `}</style>
    </>
  );
}

/* -------- inline trash SVG -------- */
const trashSvg = (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16">
    <path d="M5.5 5.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5zm2.5.5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0v-6zm3-.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5z" />
    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2h3.09a1 1 0 0 1 .97.757l.36 1.123h2.46l.36-1.123A1 1 0 0 1 9.41 1h3.09a1 1 0 0 1 1 1z" />
  </svg>
);
