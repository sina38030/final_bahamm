'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import './invite.css';

interface Product {
  id: number;
  name: string;
  description: string;
  market_price: number;
  images: string[];
}

interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  base_price: number;
  product: Product;
}

interface GroupBuy {
  expires_at: string;
  participants_count: number;
  invite_code: string;
}

interface Order {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  payment_authority: string;
  payment_ref_id: string;
  items: OrderItem[];
  group_buy: GroupBuy | null;
}

function InvitePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [friendsCount, setFriendsCount] = useState(1);
  const [basketSheetOpen, setBasketSheetOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);

  // Convert numbers to Persian digits
  const toFa = (n: number | string) => n.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);

  // Fetch order data
  useEffect(() => {
    const authority = searchParams.get('authority');
    
    if (!authority) {
      setError('پارامتر authority یافت نشد');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/payment/order/${authority}`);
        const data = await response.json();

        if (data.success) {
          setOrder(data.order);
          
          // Set 24-hour countdown timer from now
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24); // Add 24 hours from now
          
          // Update the order with the correct expiry time if needed
          if (data.order.group_buy) {
            data.order.group_buy.expires_at = expiresAt.toISOString();
          }
          
          const now = new Date();
          const timeDiff = Math.max(0, expiresAt.getTime() - now.getTime());
          setTimeLeft(Math.floor(timeDiff / 1000)); // Convert to seconds
        } else {
          setError(data.error || 'خطا در دریافت اطلاعات سفارش');
        }
      } catch (err) {
        setError('خطا در اتصال به سرور');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [searchParams]);

  // 24-hour countdown timer
  useEffect(() => {
    if (!order?.group_buy || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000); // Every second

    return () => clearInterval(interval);
  }, [order, timeLeft]);

  // Format timer display (24:00:00 format)
  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return toFa(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    );
  };

  // Calculate price based on friends count and actual order data
  const calculatePrice = () => {
    if (!order) return { text: '0 تومان', showSubLine: false, friendPrice: 0 };
    
    const basePrice = order.total_amount;
    
    if (friendsCount === 0) {
      return { 
        text: toFa(Math.round(basePrice).toLocaleString()) + ' تومان', 
        showSubLine: false,
        friendPrice: 0
      };
    } else if (friendsCount === 3) {
      return { 
        text: 'رایگان', 
        showSubLine: true,
        friendPrice: Math.round(basePrice / 2) // Friends pay half when you get free
      };
    } else {
      // Calculate group price: base_price / (friends + 1)
      const groupPrice = Math.round(basePrice / (friendsCount + 1));
      return { 
        text: toFa(groupPrice.toLocaleString()) + ' تومان', 
        showSubLine: true,
        friendPrice: groupPrice
      };
    }
  };

  const getFriendsText = () => {
    if (friendsCount === 0) return 'خرید به تنهایی';
    return `${toFa(friendsCount)} دوست`;
  };

  const calculatedPrice = calculatePrice();

  // Handle range slider background
  const getSliderBackground = () => {
    const pct = (friendsCount / 3) * 100;
    return `linear-gradient(to left, var(--pink) ${pct}%, #ddd ${pct}%)`;
  };

  // Share functions
  const handleShare = (app: string) => {
    if (!order?.group_buy) return;
    
    const baseUrl = window.location.origin;
    const inviteCode = order.group_buy.invite_code;
    const inviteURL = encodeURIComponent(`${baseUrl}/group-invite?code=${inviteCode}`);
    const inviteMsg = encodeURIComponent('بیا با هم سبد رو بخریم تا رایگان بگیریم!');
    
    let url = '#';
    switch (app) {
      case 'telegram':
        url = `https://t.me/share/url?url=${inviteURL}&text=${inviteMsg}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${inviteMsg}%20${inviteURL}`;
        break;
      case 'instagram':
        url = `https://www.instagram.com/?url=${inviteURL}`;
        break;
    }
    window.open(url, '_blank', 'noopener');
  };

  // Close sheets when clicking outside
  const closeSheets = () => {
    setBasketSheetOpen(false);
    setShareSheetOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    // Redirect to checkout after a brief delay
    setTimeout(() => {
      router.push('/checkout');
    }, 1000);
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <p>در حال انتقال به صفحه پرداخت...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>سفارش یافت نشد</p>
      </div>
    );
  }

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <div className={`invite-page ${(basketSheetOpen || shareSheetOpen) ? 'sheet-open' : ''}`}>
        {/* Header with 24-hour Timer */}
        <header className="header">
          <button className="home-btn" onClick={() => router.push('/')}>
            <i className="fa-solid fa-house-chimney"></i>
          </button>

          <h2>
            حالا وقتشه دوستات رو دعوت کنی تا سفارشـت
            <span className="free"> رایگان</span> بشه!
          </h2>

          {order.group_buy && (
            <div className="timer-wrapper">
              <span className="label">⏰ زمان باقیمانده:</span>
              <span className="timer">{formatTimer(timeLeft)}</span>
            </div>
          )}
        </header>

        {/* User Basket Card with Real Data */}
        <section className="basket-card">
          <button className="view-btn" onClick={() => setBasketSheetOpen(true)}>
            مشاهدهٔ کامل سبد ({toFa(totalItems)} کالا)
          </button>
          <div className="thumbs">
            {order.items.slice(0, 5).map((item, index) => {
              const imageUrl = item.product.images && item.product.images.length > 0 
                ? item.product.images[0] 
                : `https://via.placeholder.com/300x300/E5006A/FFFFFF?text=${encodeURIComponent(item.product.name)}`;
              
              return (
                <img 
                  key={index} 
                  src={imageUrl} 
                  alt={item.product.name}
                  onError={(e) => {
                    e.currentTarget.src = `https://via.placeholder.com/300x300/E5006A/FFFFFF?text=${encodeURIComponent(item.product.name)}`;
                  }}
                />
              );
            })}
          </div>
        </section>

        {/* Group vs Individual Pricing Card */}
        <section className="discount-card">
          <p className="text">
            اگر <b className="pink">{getFriendsText()}</b> سبدت را بخرند، مبلغ بجای
            <b className="base"> {toFa(Math.round(order.total_amount).toLocaleString())}&nbsp;تومان</b>
            می‌شود <b className="pink">{calculatedPrice.text}</b>.
          </p>
          {calculatedPrice.showSubLine && calculatedPrice.friendPrice > 0 && (
            <p className="sub-line">
              قیمت سبد برای هر دوست: <span className="pink">{toFa(calculatedPrice.friendPrice.toLocaleString())}</span> تومان
            </p>
          )}

          <div className="range-wrap">
            <input
              type="range"
              min="0"
              max="3"
              step="1"
              value={friendsCount}
              onChange={(e) => setFriendsCount(parseInt(e.target.value))}
              style={{ background: getSliderBackground() }}
            />
            <span className="free-pill">رایگان</span>
          </div>

          <button className="invite-btn" onClick={() => setShareSheetOpen(true)}>
            دعوت دوستان
          </button>
        </section>

        {/* Description Card */}
        <section className="description-card">
          <h3>توضیحات</h3>
          <p>
            • هزینهٔ ارسال به عهدهٔ مشتری است.<br />
            • لغو سفارش پس از ۷ روز امکان‌پذیر نیست.<br />
            • در صورت تکمیل نشدن دعوت دوستان، مبلغ اولیه شارژ می‌شود.<br />
            • برای دریافت سفارش رایگان، حداقل ۳ دوست باید سبد مشابه خریداری کنند.
          </p>
        </section>
      </div>

      {/* Basket Sheet with Real Order Data */}
      <aside 
        className={`sheet ${basketSheetOpen ? 'open' : ''}`} 
        onClick={(e) => e.target === e.currentTarget && closeSheets()}
      >
        <header>
          <h4>{toFa(totalItems)} کالا در سبد</h4>
          <button className="close" onClick={closeSheets}>&times;</button>
        </header>
        <ul className="basket-list">
          {order.items.map((item, index) => {
            const imageUrl = item.product.images && item.product.images.length > 0 
              ? item.product.images[0] 
              : `https://via.placeholder.com/300x300/E5006A/FFFFFF?text=${encodeURIComponent(item.product.name)}`;
            
            return (
              <li key={index} className="basket-item">
                <img 
                  src={imageUrl} 
                  alt={item.product.name}
                  onError={(e) => {
                    e.currentTarget.src = `https://via.placeholder.com/300x300/E5006A/FFFFFF?text=${encodeURIComponent(item.product.name)}`;
                  }}
                />
                <div className="info">
                  <div className="name">{item.product.name}</div>
                  <div className="meta">{item.product.description}</div>
                  <div className="qty">تعداد: {toFa(item.quantity)}</div>
                </div>
                <div className="price">
                  {item.product.market_price > item.base_price && (
                    <s>{toFa(Math.round(item.product.market_price * item.quantity).toLocaleString())}&nbsp;تومان</s>
                  )}
                  <span className="new">{toFa(Math.round(item.base_price * item.quantity).toLocaleString())}&nbsp;تومان</span>
                </div>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Share Sheet */}
      <aside 
        className={`sheet ${shareSheetOpen ? 'open' : ''}`}
        onClick={(e) => e.target === e.currentTarget && closeSheets()}
      >
        <header>
          <h4>دعوت دوستان</h4>
          <button className="close" onClick={closeSheets}>&times;</button>
        </header>
        <div className="share-apps">
          <button onClick={() => handleShare('telegram')}>
            <i className="fa-brands fa-telegram"></i>
            <span>تلگرام</span>
          </button>
          <button onClick={() => handleShare('whatsapp')}>
            <i className="fa-brands fa-whatsapp"></i>
            <span>واتساپ</span>
          </button>
          <button onClick={() => handleShare('instagram')}>
            <i className="fa-brands fa-instagram"></i>
            <span>اینستاگرام</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 bg-gray-300 rounded-full mx-auto mb-4"></div>
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    }>
      <InvitePageContent />
    </Suspense>
  );
}