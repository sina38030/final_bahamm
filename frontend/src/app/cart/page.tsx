'use client';

/*  ░░  صفحهٔ سبد خرید ـ نسخهٔ فاینال  ░░  */
/*  توضیح: منطق سبد از CartContext می‌آید؛  UI دقیقاً طبق ماکاپ   */

import { useState, useMemo, Fragment, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import PhoneAuthModal from '@/components/auth/PhoneAuthModal';

/* ---------------------- helpers ---------------------- */
const toFa = (val: number | string) =>
  val.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

const comma = (n?: number | null) => {
  if (n == null || isNaN(n)) return toFa('0');
  return toFa(n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬'));
};

const Toman = ({ value }: { value?: number | null }) => (
  <span className="money">
    {comma(value)}{'\u00A0'}<span className="toman">تومان</span>
  </span>
);

/* قیمت متغیّر محصول براساس اسلایدر دوستان */
const priceByFriends = (base?: number | null, friend?: number | null, f = 1) => {
  const safeBase = base ?? 0;
  if (f === 0) return safeBase; // خرید تنها
  if (f === 1) return friend ?? Math.round(safeBase * 0.5); // با ۱ دوست = نصف
  if (f === 2) return Math.round(safeBase / 4); // با ۲ دوست = یک چهارم
  if (f === 3) return 0; // با ۳ دوست = رایگان
  return safeBase;
};

/* قیمت واقعی هر کالا بر اساس فیلدهای ادمین (solo_price, friend_1_price, friend_2_price, friend_3_price) */
const getItemGroupPrice = (item: any, friends: number): number => {
  // Prefer admin-defined prices; use sensible fallbacks when missing
  const solo = item?.solo_price ?? item?.market_price ?? (item?.base_price ? item.base_price * 2 : 0);
  const f1   = item?.friend_1_price ?? Math.round(solo / 2);
  const f2   = (() => {
    const raw = Number(item?.friend_2_price);
    return Number.isFinite(raw) && raw > 0 ? raw : Math.round(solo / 3);
  })();
  const f3   = item?.friend_3_price ?? 0;
  
  if (friends === 0) return solo;
  if (friends === 1) return f1;
  if (friends === 2) return f2;
  if (friends === 3) return f3;
  return solo;
};

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, totalItems } = useCart();
  const { isAuthenticated } = useAuth();
  const [friends, setFriends] = useState(1); // 0 = تنها ... 3 = چهار نفر (=رایگان)
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [pendingCheckoutMode, setPendingCheckoutMode] = useState<'alone' | 'group' | null>(null);

  // Update slider background dynamically based on value
  useEffect(() => {
    const slider = document.getElementById('friends-slider') as HTMLInputElement;
    if (slider) {
      const value = parseInt(slider.value);
      const max = parseInt(slider.max);
      const percentage = (value / max) * 100;

      // Create gradient from left to current position
      const pink = '#e31c5f';
      const gray = '#ddd';
      slider.style.background = `linear-gradient(to left, ${pink} 0%, ${pink} ${percentage}%, ${gray} ${percentage}%)`;
    }
  }, [friends]);


  /* جمع کل‌ها */
  const totals = useMemo(() => {
    // Debug individual item prices (only if هندوانه is in cart)
    if (items.some(p => p.name?.includes('هندوانه'))) {
      console.log('🔍 هندوانه in cart - debug prices:', items.find(p => p.name?.includes('هندوانه')));
    }

    const alone = items.reduce((s, p: any) => s + getItemGroupPrice(p, 0) * p.quantity, 0);
    const friend1Total = items.reduce((s, p: any) => s + getItemGroupPrice(p, 1) * p.quantity, 0);
    const friend2Total = items.reduce((s, p: any) => s + getItemGroupPrice(p, 2) * p.quantity, 0);

    let your: number;
    if (friends === 0) your = alone; // تنها
    else if (friends === 1) your = friend1Total; // نصف یا قیمت اختصاصی
    else if (friends === 2) your = friend2Total; // یک چهارم یا قیمت اختصاصی
    else if (friends === 3) your = 0; // رایگان
    else your = alone;

    // محاسبه درصد پرداخت نسبت به قیمتِ دوستان (۱ دوست) برای ارسال به چک‌اوت
    const baseForPercentage = friend1Total > 0 ? friend1Total : alone;
    const paymentPercentage = your === 0 ? 0 : Math.round((your / baseForPercentage) * 100);
    const leaderPaymentAmount = your;

    // قیمت مرجع برای ارسال به چک‌اوت (باید قیمت انتخاب شده باشد)
    const selectedFriendPrice = friends === 0 ? alone : 
                               friends === 1 ? friend1Total : 
                               friends === 2 ? friend2Total : 
                               0; // friends === 3 is free

    return { alone, withFriend: friend1Total, friend2Total, your, leaderPaymentAmount, paymentPercentage, selectedFriendPrice };
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

      {/* Empty state */}
      {totalItems === 0 && (
        <section
          className="empty"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
            color: '#777',
            minHeight: '40vh',
          }}
        >
          <img
            src="/img/icons/basket.svg"
            alt="سبد خالی"
            style={{ width: 96, height: 96, opacity: 0.5, marginBottom: '0.75rem' }}
          />
          <p style={{ fontSize: 14 }}>کالایی در سبد نیست</p>
          <Link
            href="/"
            className="go-shop"
            style={{
              marginTop: '1rem',
              background: '#E31C5F',
              color: '#fff',
              padding: '0.6rem 1rem',
              borderRadius: 12,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            رفتن به فروشگاه
          </Link>
        </section>
      )}

      {/*  Basket card */}
      {totalItems > 0 && (
      <section className="basket">
        {items.filter((p) => p.quantity > 0).map((p) => (
          <div className="product" key={p.id}>
            <img
              src={p.image && p.image.trim() !== '' ? p.image : `https://picsum.photos/seed/${p.id}/100/100`}
              alt={p.name}
              onError={(e) => {
                const fallback = `https://picsum.photos/seed/${p.id}/100/100`;
                if (e.currentTarget.src !== fallback) e.currentTarget.src = fallback;
              }}
            />

            <div className="info">
              <span className="title">{p.name}</span>
              {/* وزن/توضیح محصول در داده‌ها ممکن است موجود نباشد */}

              <div className="qtyCtrl">
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
                  {(() => {
                    const solo = (p as any)?.solo_price ?? (p as any)?.market_price ?? ((p as any)?.base_price ? (p as any).base_price * 2 : 0);
                    const totalSolo = solo * p.quantity;
                    return (
                      <>
                        {comma(totalSolo)} <span className="toman">تومان</span>
                      </>
                    );
                  })()}
                </span>
              )}
              <span className="price-main">
                {(() => {
                  const unitPrice = getItemGroupPrice(p as any, friends);
                  const totalPrice = unitPrice * p.quantity;
                  return totalPrice === 0 ? (
                    'رایگان!'
                  ) : (
                    <Toman value={totalPrice} />
                  );
                })()}
              </span>
            </div>
          </div>
        ))}
      </section>
      )}

      {/*  Discount card  */}
      {totalItems > 0 && (
      <section className="discount">
        {friends === 0 ? (
          <p className="text">
            اگر هیچ دوستی عضو گروهت نشه، مبلغ سفارشت از{' '}
            <b className="pink">
              <Toman value={totals.alone} />
            </b>{' '}
            کاهش پیدا نمیکنه.
          </p>
        ) : (
          <p className={`text ${friends === 3 ? 'tight' : ''}`}>
            وقتی{' '}
            <b className="pink">
              {toFa(friends)} دوست
            </b>{' '}
             سبدت رو بخرن، مبلغ سفارشِت <span className="nowrap">بجای{' '}
            <b className="pink">
              <Toman value={totals.alone} />
            </b></span>{' '}
            به{' '}
            <b className="pink x-amount">
              {totals.your === 0 ? 'رایگان!' : <Toman value={totals.your} />}
            </b>{' '}
            کاهش پیدا میکنه.
          </p>
        )}
        {friends !== 0 && (
          <p className="sub">
            قیمت سبد برای دوستانت: <Toman value={totals.withFriend} />
          </p>
        )}

        <div className="range-wrap">
          <input
            id="friends-slider"
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
      )}



      

      {/*  footer buttons  */}
      {totalItems > 0 && (
      <footer className="fbar">
        <button
          className="solo"
          onClick={() => {
            if (!isAuthenticated) {
              setPendingCheckoutMode('alone');
              setShowPhoneModal(true);
              return;
            }
            router.push('/checkout?mode=alone');
          }}
        >
          خرید به تنهایی<br />
          <Toman value={totals.alone} />
        </button>
        <button
          className="group"
          onClick={() => {
            if (!isAuthenticated) {
              setPendingCheckoutMode('group');
              setShowPhoneModal(true);
              return;
            }
            // Pass payment amount and percentage to checkout
            console.log('🛒 Cart sending to checkout:', {
              friends: friends,
              leaderPaymentAmount: totals.leaderPaymentAmount,
              selectedFriendPrice: totals.selectedFriendPrice,
              alone: totals.alone,
              withFriend: totals.withFriend,
              friend2Total: totals.friend2Total
            });
            // Enforce at least 1-friend pricing when starting group purchase
            const friendsForPricing = friends === 0 ? 1 : friends;
            const params = new URLSearchParams({
              mode: 'group',
              // If toggle is at 0, force payment amount to friend-1 total
              paymentAmount: (friends === 0 ? totals.withFriend : totals.leaderPaymentAmount).toString(),
              paymentPercentage: totals.paymentPercentage.toString(),
              // Friend reference price should be friend-1 total when starting group
              friendPrice: (friends === 0 ? totals.withFriend : totals.selectedFriendPrice).toString(),
              friends: friendsForPricing.toString(),
              maxFriends: '3',
              expectedFriends: friendsForPricing.toString()  // Track expected friends count
            });
            router.push(`/checkout?${params.toString()}`);
          }}
        >
          خرید گروهی<br />
          {friends > 0 ? (
            totals.paymentPercentage === 0 ? (
              <span className="free">رایگان!</span>
            ) : (
              <Toman value={totals.leaderPaymentAmount} />
            )
          ) : (
            <Toman value={totals.withFriend} />
          )}
        </button>
      </footer>
      )}

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
          color: #333;
        }
        .toman { font-size: 12px; margin-left: 2px; }
        .money { white-space: nowrap; }
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
          left: 115px;
          top: 55%;
          transform: translateY(-50%);
          background: #ccc;
          padding: 0.08rem 0.5rem;
          border-radius: 0.3rem;
          font-size: 12px;
        }
        .basket {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 10px 10px #0001;
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
        .qtyCtrl { display: flex; align-items: center; gap: 0.25rem; margin-top: 0.25rem; }
        .qtyCtrl button {
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
          box-shadow: 0 10px 10px #0001;
          margin: 0 1rem 1rem;
          padding: 15px;
        }
        .text { font-size: 14px; line-height: 1.9; margin-bottom: 0.7rem; }
        .sub { font-size: 13px; color: var(--txt-light); margin-bottom: 1rem; }
        .pink { color: var(--pink); font-weight: 700; }
        .x-amount { color: #e31c5f; }
        .nowrap { white-space: nowrap; }
        /* Ensure amount + تومان fit on first line in discount text */
        .discount .text .money { display: inline-block; font-size: 12px; letter-spacing: -0.2px; }
        .discount .text.tight .money { font-size: 11.5px; }
        .range-wrap { position: relative; }
        input[type='range'] {
          -webkit-appearance: none; width: 100%; height: 6px; border-radius: 3px;
          background: #ddd;
          cursor: pointer; direction: rtl; outline: none;
          transition: all 0.2s ease;
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none; width: 32px; height: 32px; border: 4px solid #fff;
          border-radius: 50%; background: #fff; box-shadow: 0 6px 12px #0003;
          position: relative; z-index: 2; cursor: pointer;
          transition: all 0.2s ease;
        }
        input[type='range']::-webkit-slider-thumb::after {
          content: ''; position: absolute; top: 50%; left: 50%;
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--pink); transform: translate(-50%, -50%);
          transition: all 0.2s ease; z-index: 1;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 16px #0004;
        }
        input[type='range']::-webkit-slider-thumb:hover::after {
          transform: translate(-50%, -50%) scale(1.1);
        }
        input[type='range']:active::-webkit-slider-thumb {
          transform: scale(1.15);
          box-shadow: 0 10px 20px #0005;
        }
        input[type='range']:active::-webkit-slider-thumb::after {
          transform: translate(-50%, -50%) scale(1.2);
        }
        .free-pill {
          position: absolute; left: 0; top: -1.4rem; transform: translateX(-40%);
          background: var(--pink); color: #fff; padding: 0.05rem 0.6rem;
          border-radius: 10px; font-size: 0.72rem; white-space: nowrap;
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
        .fbar .solo {
          background: #fff;
          border: 2px solid #E73862;
          color: #E31C5F;
          box-shadow: none;
        }
        .fbar .solo:focus,
        .fbar .solo:hover {
          outline: none;
          box-shadow: none;
        }
        .group {
          background: #E73862;
          color: #fff;
        }
        .group .free {
          color: #fff;
        }

      `}</style>

      {/* Phone Authentication Modal */}
      <PhoneAuthModal
        isOpen={showPhoneModal}
        onClose={() => {
          setShowPhoneModal(false);
          setPendingCheckoutMode(null);
        }}
        onSuccess={() => {
          setShowPhoneModal(false);
          // Redirect to checkout with the pending mode
          if (pendingCheckoutMode) {
            if (pendingCheckoutMode === 'group') {
              const params = new URLSearchParams({
                mode: 'group',
                paymentAmount: totals.leaderPaymentAmount.toString(),
                paymentPercentage: totals.paymentPercentage.toString(),
                friendPrice: totals.selectedFriendPrice.toString(),
                friends: friends.toString(),
                maxFriends: '3'
              });
              router.push(`/checkout?${params.toString()}`);
            } else {
              router.push(`/checkout?mode=${pendingCheckoutMode}`);
            }
          }
          setPendingCheckoutMode(null);
        }}
      />
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
