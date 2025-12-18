'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import './invite.css';
import { useAuth } from '@/contexts/AuthContext';
import { generateInviteLink, generateShareUrl, extractInviteCode, isTelegramMiniApp } from '@/utils/linkGenerator';
import { API_BASE_URL } from '@/utils/api';

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
  const { user, token, isAuthenticated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [expiresAtISO, setExpiresAtISO] = useState<string | null>(null);
  const [expiryMs, setExpiryMs] = useState<number | null>(null);
  const [inviteDisabled, setInviteDisabled] = useState(false);
  const [groupStatus, setGroupStatus] = useState<string | null>(null);

  // Derived info for progress texts (match Groups tab)
  const [nonLeaderPaid, setNonLeaderPaid] = useState<number | null>(null);
  const [requiredMembers, setRequiredMembers] = useState<number | null>(null);
  const [originalTotal, setOriginalTotal] = useState<number | null>(null);
  const [currentTotal, setCurrentTotal] = useState<number | null>(null);
  const [progressReady, setProgressReady] = useState(false);
  const [isSecondaryFlow, setIsSecondaryFlow] = useState(false);
  const [isSecondaryGroup, setIsSecondaryGroup] = useState(false);


  const markSecondaryFlow = (payload?: any, fallbackRequiredMembers?: number) => {
    const isSecondary = Boolean(
      payload?.isSecondaryGroup === true ||
      String(payload?.groupType || '').toLowerCase() === 'secondary' ||
      String(payload?.kind || payload?.group?.kind || '').toLowerCase() === 'secondary'
    );
    if (isSecondary || fallbackRequiredMembers === 4) {
      setIsSecondaryFlow(true);
    }
    setIsSecondaryGroup(prev => prev || isSecondary || fallbackRequiredMembers === 4);
    return isSecondary;
  };


  // Convert numbers to Persian digits
  const toFa = (n: number | string) => n.toString().replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);

  // Format timer as HH:MM:SS
  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Fetch order data with retry logic for fresh payments
  useEffect(() => {
    const authority = searchParams.get('authority');

    if (!authority) {
      setError('پارامتر authority یافت نشد');
      setLoading(false);
      return;
    }

    const fetchOrder = async (retryCount = 0) => {
      try {
        const response = await fetch(`${API_BASE_URL}/payment/order/${authority}`);
        const data = await response.json();

        if (data.success) {
          setOrder(data.order);
          setLoading(false);
          // Show success banner when returning from bank with ref_id or confirmed order
          // Show for actual payments, not just order registration
          const refIdParam = searchParams.get('ref_id');
          if (refIdParam || data.order?.payment_ref_id) {
            setShowSuccess(true);
            // Auto-hide the banner after 4 seconds
            setTimeout(() => {
              setShowSuccess(false);
            }, 4000);
          }

          // If group buy exists, start countdown
          if (data.order?.group_buy?.expires_at) {
            setExpiresAtISO(data.order.group_buy.expires_at);
            const expiry = new Date(data.order.group_buy.expires_at);
            setExpiryMs(expiry.getTime());
          }

          // Mark as secondary flow if applicable
          if (data.order?.group_buy) {
            markSecondaryFlow(data.order.group_buy);
          }
        } else {
          if (retryCount < 3 && data.order?.status === 'pending') {
            // Retry for pending orders (might be processing)
            setTimeout(() => fetchOrder(retryCount + 1), 2000);
          } else {
            setError(data.message || 'خطا در بارگذاری سفارش');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Order fetch error:', err);
        setError('خطا در اتصال به سرور');
        setLoading(false);
      }
    };

    fetchOrder();
  }, [searchParams]);


  // Disable invite if group is already completed (success) or expired
  useEffect(() => {
    // Determine invite code from order info
    const authoritySource = searchParams.get('authority') || '';
    const code = order?.group_buy?.invite_code || (order?.id && authoritySource
      ? `GB${order.id}${authoritySource.slice(0, 8)}`
      : '');
    if (!code) return;
    let abort = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/groups/${encodeURIComponent(code)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const status = String(data?.status || '').toLowerCase();
        if (abort) return;
        setGroupStatus(status);
        // Disable invite for groups that are not ongoing (finalized groups)
        if (status !== 'ongoing') {
          setInviteDisabled(true);
        } else {
          setInviteDisabled(false);
        }
      } catch {}
    })();
    return () => { abort = true; };
  }, [order, searchParams]);

  // Fallback/secondary check: use group-invite endpoint to resolve status reliably
  useEffect(() => {
    const authoritySource = searchParams.get('authority') || '';
    const code = order?.group_buy?.invite_code || (order?.id && authoritySource
      ? `GB${order.id}${authoritySource.slice(0, 8)}`
      : '');
    if (!code) return;
    let abort = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/group-invite/${encodeURIComponent(code)}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (abort) return;
        const statusRaw = String(data?.status || '').toLowerCase();
        const normalized = statusRaw.includes('final') || statusRaw.includes('success') || statusRaw.includes('موفق')
          ? 'success'
          : (statusRaw.includes('fail') || statusRaw.includes('expired') || statusRaw.includes('منقضی') || statusRaw.includes('ناموفق'))
            ? 'failed'
            : 'ongoing';
        setGroupStatus(prev => prev || normalized);
        // Disable invite for groups that are not ongoing (finalized groups)
        if (normalized !== 'ongoing') {
          setInviteDisabled(true);
        } else {
          setInviteDisabled(false);
        }
      } catch {}
    })();
    return () => { abort = true; };
  }, [order, searchParams]);

  // Load group status and expiry; also used to disable invite when complete
  useEffect(() => {
    const authority = searchParams.get('authority') || '';
    const code = order?.group_buy?.invite_code || (order?.id && authority
      ? `GB${order.id}${authority.slice(0, 8)}`
      : '');
    if (!code) return;
    let abort = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/groups/${encodeURIComponent(code)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (abort) return;
        const status = String(data?.status || '').toLowerCase();
        // Disable invite for groups that are not ongoing (finalized groups)
        if (status !== 'ongoing') {
          setInviteDisabled(true);
        } else {
          setInviteDisabled(false);
        }
        // Determine group type from payload (regular logic)
        const isSecondary = markSecondaryFlow(data);
        const participants = Array.isArray((data as any)?.participants) ? (data as any).participants : [];
        const paidCount = participants.reduce((acc: number, p: any) => {
          try {
            const isLeader = p?.isLeader === true || p?.is_leader === true || p?.role === 'leader';
            const statusStr = String(p?.status || '').toLowerCase();
            const paid = p?.paid === true || statusStr.includes('paid') || statusStr.includes('success');
            return acc + (!isLeader && paid ? 1 : 0);
          } catch { return acc; }
        }, 0);

        if (isSecondary) {
          const effectiveSecondary = (() => {
            const snapshotPricing = (data as any)?.pricing;
            if (snapshotPricing && Number.isFinite(Number(snapshotPricing.originalTotal))) {
              const base = Number(snapshotPricing.originalTotal) || 0;
              if (base > 0) {
                const { solo, current } = computeSecondaryTotals(paidCount, base);
                return { solo, current };
              }
            }

            const basketArr: any[] = Array.isArray((data as any)?.basket) ? (data as any).basket : [];
            let basketValue = 0;
            if (basketArr.length > 0) {
              basketArr.forEach((it: any) => {
                const qty = Number(it.qty ?? it.quantity ?? 1) || 1;
                const unit = Number(it.unitPrice ?? it.unit_price ?? it.market_price ?? it.original_price ?? 0) || 0;
                basketValue += unit * qty;
              });
            }
            if (basketValue === 0 && order) {
              basketValue = (order.items || []).reduce((sum, item) => {
                const productId = item.product_id || item.id;
                const prices = getProductPrices(productId);
                return sum + prices.solo_price * (item.quantity || 1);
              }, 0);
            }
            return computeSecondaryTotals(paidCount, basketValue);
          })();

          setNonLeaderPaid(Math.max(0, paidCount));
          setRequiredMembers(4);
          setIsSecondaryFlow(prev => prev || true);
          setOriginalTotal(effectiveSecondary.solo);
          setCurrentTotal(effectiveSecondary.current);
          setProgressReady(effectiveSecondary.solo > 0);
        } else {
          setIsSecondaryFlow(false);
          setNonLeaderPaid(paidCount);
          setRequiredMembers(3);
          // Regular group: derive counts and pricing like Groups tab
          try {
            const pricing = (data as any)?.pricing;
            const basketArr: any[] = Array.isArray((data as any)?.basket) ? (data as any).basket : [];

            // Compute candidate totals from server payloads
            let candOrig = 0;
            let candCurr = 0;
            if (pricing && Number.isFinite(Number(pricing.originalTotal)) && Number.isFinite(Number(pricing.currentTotal))) {
              candOrig = Number(pricing.originalTotal) || 0;
              candCurr = Number(pricing.currentTotal) || 0;
            } else if (basketArr.length > 0) {
              // Fallback: compute from basket items
              basketArr.forEach((it: any) => {
                const qty = Number(it.qty ?? it.quantity ?? 1) || 1;
                const unit = Number(it.unitPrice ?? it.unit_price ?? it.market_price ?? it.original_price ?? 0) || 0;
                const friendUnit = Number(it.friendPrice ?? it.friend_price ?? it.price ?? 0) || unit;
                candOrig += unit * qty;
                candCurr += friendUnit * qty;
              });
            }

            // Use computed values if reasonable, otherwise use order total
            if (candOrig > 0 && candCurr > 0 && candCurr <= candOrig) {
              setOriginalTotal(candOrig);
              setCurrentTotal(candCurr);
              setProgressReady(true);
            } else if (order?.total_amount) {
              const solo = Number(order.total_amount) || 0;
              const derived = computeSecondaryTotals(paidCount, solo);
              setOriginalTotal(solo);
              setCurrentTotal(derived.current);
              setProgressReady(solo > 0);
            } else {
              setProgressReady(false);
            }
          } catch {
            setProgressReady(false);
          }
        }
      } catch {}
    })();
    return () => { abort = true; };
  }, [order]);

  // Timer countdown
  useEffect(() => {
    if (!expiryMs) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiryMs - now);
      setTimeLeft(Math.floor(remaining / 1000));

      if (remaining <= 0) {
        // Group expired
        setInviteDisabled(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiryMs]);

  // Get product pricing info (cached)
  const getProductPrices = (productId: number) => {
    // Simplified pricing - you might want to expand this based on your pricing logic
    return {
      solo_price: 100000, // Default price
      friend_1_price: 90000,
      friend_2_price: 80000,
      friend_3_price: 70000
    };
  };

  // Compute totals for an achieved tier based on paid non-leaders
  const computeSecondaryTotals = (tier: number, basketValue: number) => {
    const quarter = basketValue / 4;
    const current = tier >= 4 ? 0 : basketValue - tier * quarter;
    return { solo: basketValue, current: Math.max(0, current) };
  };

  // Precompute share URLs for direct-anchor approach
  const shareMsg = 'بیا با هم سبد رو بخریم تا رایگان بگیریم!';

  const resolvedInviteLink = useMemo(() => {
    if (!order) return '';

    // Get invite code from various sources
    let inviteCode = '';

    // Try backend-provided invite_url first
    const backendUrl = (order as any)?.group_buy?.invite_url as string | undefined;
    if (backendUrl) {
      const extractedCode = extractInviteCode(backendUrl);
      if (extractedCode) inviteCode = extractedCode;
    }

    // Try direct invite_code
    if (!inviteCode && order.group_buy?.invite_code) {
      inviteCode = order.group_buy.invite_code;
    }

    // Generate code from order ID and authority as fallback
    if (!inviteCode) {
      const authorityParam = (typeof window !== 'undefined')
        ? (new URLSearchParams(window.location.search).get('authority') || '')
        : '';
      const authoritySource = order.payment_authority || authorityParam || '';
      if (order.id && authoritySource) {
        inviteCode = `GB${order.id}${authoritySource.slice(0, 8)}`;
      }
    }

    if (!inviteCode) return '';

    // Generate environment-aware link (Telegram mini app vs website)
    const finalLink = generateInviteLink(inviteCode);
    return finalLink;
  }, [order]);

  // Include the link inside the text too for clients that ignore the url param
  const encodedMsg = encodeURIComponent(`${shareMsg} ${resolvedInviteLink || ''}`.trim());
  const shareText = `${shareMsg} ${resolvedInviteLink || ''}`.trim();
  const encodedLanding = encodeURIComponent(resolvedInviteLink || '');

  const openTelegramShare = (landingUrl: string) => {
    if (!landingUrl) return;

    const tg = (window as any)?.Telegram?.WebApp;
    const webShareUrl = generateShareUrl('telegram', landingUrl, shareMsg);

    // Telegram Mini App: use WebApp API when available (most Telegram-native behavior)
    if (isTelegramMiniApp() && tg && typeof tg.openTelegramLink === 'function') {
      try {
        tg.openTelegramLink(webShareUrl);
        return;
      } catch {}
    }

    // Website / non-Telegram: use tg:// deep link (native share), then fallback to web share URL
    const text = `${shareMsg} ${landingUrl}`.trim();
    const deepLink = `tg://msg_url?url=${encodeURIComponent(landingUrl)}&text=${encodeURIComponent(text)}`;
    try {
      (window as any).location.href = deepLink;
    } catch {}

    // Fallback after a short delay (if Telegram isn't installed, user stays on page)
    setTimeout(() => {
      try {
        if (document.visibilityState === 'visible') {
          (window as any).location.href = webShareUrl;
        }
      } catch {
        try { (window as any).location.href = webShareUrl; } catch {}
      }
    }, 700);
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
    // Show error message instead of redirecting to checkout
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">خطا در بارگذاری</h2>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={() => router.push('/checkout')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            بازگشت به صفحه پرداخت
          </button>
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

  const totalItems = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Success purchase notification */}
      {showSuccess && (
        <div className="success-banner" role="status" aria-live="polite">
          <div className="success-content">
            <div className="success-title">پرداخت با موفقیت انجام شد ✅</div>
            <div className="success-details">
              <div>
                <span>مبلغ پرداخت:</span>
                <b>{toFa(Math.round(order.total_amount || 0).toLocaleString())} تومان</b>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="invite-page">
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

        {/* Basket Card */}
        <section className="basket-card">
          <div className="thumbs">
            {(order.items || []).slice(0, 5).map((item, index) => {
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

        {/* Progress Card */}
        <section className="discount-card">
          <div className="text-right">
            {progressReady && nonLeaderPaid !== null ? (
              <p>
                {nonLeaderPaid === 1
                  ? 'تا الان ۱ نفر از دوستانت عضو گروه شده است.'
                  : `تا الان ${toFa(nonLeaderPaid.toLocaleString())} نفر از دوستانت عضو گروه شده است.`}
              </p>
            ) : null}
            {progressReady && originalTotal !== null && currentTotal !== null ? (
              <p>
                {(isSecondaryFlow || isSecondaryGroup)
                  ? `هر دوستی که دعوت می‌کنی یک چهارم هزینه‌ی اولیه (${toFa(Math.round(originalTotal).toLocaleString())} تومان) را برمی‌گرداند؛ الان سهم تو ${currentTotal === 0 ? 'رایگان' : `${toFa(Math.round(currentTotal).toLocaleString())} تومان`} است.`
                  : `قیمت از ${toFa(Math.round(originalTotal).toLocaleString())} تومان به ${currentTotal === 0 ? 'رایگان' : `${toFa(Math.round(currentTotal).toLocaleString())} تومان`} کاهش یافته!`}
              </p>
            ) : null}
            {(groupStatus === 'success' || groupStatus === 'failed') && (
              <div className={`text-sm mt-1 ${groupStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {groupStatus === 'success' ? 'این خرید گروهی به اتمام رسیده است.' : 'این خرید گروهی ناموفق بوده است.'}
              </div>
            )}
          </div>
          {progressReady && requiredMembers !== null && nonLeaderPaid !== null ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                <span>{toFa(Math.max(0, requiredMembers - nonLeaderPaid).toLocaleString())} دوست دیگر تا تکمیل</span>
              </div>
              <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ height: '8px', width: `${Math.min(100, (nonLeaderPaid / requiredMembers) * 100)}%`, background: 'var(--pink)', borderRadius: '6px', transition: 'width .3s' }} />
              </div>
            </>
          ) : null}

          <button
            className={`invite-btn${(inviteDisabled) ? ' disabled' : ''}`}
            onClick={() => {
              if (resolvedInviteLink) {
                openTelegramShare(resolvedInviteLink);
              } else {
                // Fallback: use a generic share URL if no specific link
                const genericUrl = isTelegramMiniApp() ?
                  'https://t.me/Bahamm_bot/bahamm' :
                  'https://bahamm.ir';
                openTelegramShare(genericUrl);
              }
            }}
            disabled={inviteDisabled}
            aria-disabled={inviteDisabled}
            title={'دعوت دوستان در تلگرام'}
          >
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

      {/* Minimal styles for success banner */}
      <style jsx>{`
        .success-banner { position: fixed; bottom: 80px; right: 10px; left: 10px; z-index: 1000; }
        .success-content { background: #e6f7ec; border: 1px solid #95d5a0; color: #14532d; border-radius: 12px; padding: 12px 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.06); position: relative; }
        .success-title { font-weight: 800; margin-bottom: 6px; }
        .success-details { display: grid; grid-template-columns: 1fr; gap: 2px; font-size: 0.9rem; }
        .success-details span { color: #3f8360; margin-left: 6px; }
        @media (min-width: 480px){ .success-banner { left: auto; width: 420px; } }
      `}</style>
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