"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import GroupBuyResultContent from '@/components/groupbuy/GroupBuyResultContent';
import { useAuth } from '@/contexts/AuthContext';
import { safeStorage, safeSessionStorage } from '@/utils/safeStorage';
import { getApiUrl } from '@/utils/api';

interface OrderSummary {
  originalPrice: number;
  groupDiscount: number;
  finalItemsPrice: number;
  shippingCost: number;
  rewardCredit: number;
  grandTotal: number;
  amountPaid: number;
}

interface GroupBuyResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  actualMembers: number;
  requiredMembers: number;
  initialPaid: number;
  finalLeaderPrice: number;
  orderSummary: OrderSummary;
  shareUrl?: string;
}

type SettlementState = 'settled' | 'leader_owes' | 'refund_due';

const GroupBuyResultModal: React.FC<GroupBuyResultModalProps> = ({
  isOpen,
  onClose,
  groupId,
  actualMembers,
  requiredMembers,
  initialPaid,
  finalLeaderPrice,
  orderSummary,
  shareUrl = '',
}) => {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [submittingCard, setSubmittingCard] = useState(false);
  const [serverDelta, setServerDelta] = useState<number | null>(null);
  const [refundSubmitted, setRefundSubmitted] = useState(false);
  // Use Next.js API route as proxy to avoid CORS/auth issues
  const { token, isAuthenticated } = useAuth();

  const getBackendUrl = () => {
    // Derive from central API detection to avoid hostname edge-cases (Telegram WebView, etc.)
    const apiBase = getApiUrl(); // e.g. https://bahamm.ir/backend/api OR http://localhost:8001/api
    return apiBase.replace(/\/api\/?$/, '');
  };

  const getAuthToken = () => {
    if (token) return token;
    try {
      return safeStorage.getItem('auth_token');
    } catch {
      return null;
    }
  };

  // Determine settlement strictly by payment delta to avoid relying on possibly wrong counts
  const rawDelta = Number(finalLeaderPrice) - Number(initialPaid);
  const delta = rawDelta;
  // NOTE: Final UI should rely on effectiveDelta (serverDelta fallback) to avoid stale client calc

  // Effective delta prioritizes server-reported settlement over client calc
  const effectiveDelta = serverDelta ?? delta;

  // استفاده از مقادیر API که حالا دقیقاً مانند cart محاسبه می‌شوند
  const displayOrderSummary = useMemo(() => {
    if (!orderSummary) return null;
    
    // API حالا دقیقاً مانند cart محاسبه می‌کند:
    // originalPrice = alone (قیمت تنها خریدن)
    // finalItemsPrice = leaderPrice (قیمت لیدر با دوستان واقعی)
    // groupDiscount = alone - leaderPrice
    const originalPrice = orderSummary.originalPrice || 0;
    const finalPrice = orderSummary.finalItemsPrice || 0;
    const actualDiscount = Math.max(0, originalPrice - finalPrice);
    
    return {
      ...orderSummary,
      originalPrice: originalPrice,
      groupDiscount: actualDiscount,
      finalItemsPrice: finalPrice,
    };
  }, [orderSummary]);

  // Try to fetch authoritative settlement amount from backend to avoid client-side drift
  useEffect(() => {
    if (!isOpen) return;
    // Initialize refundSubmitted from localStorage for this group
    const key = `gb-refund-submitted-${groupId}`;
    const val = safeStorage.getItem(key);
    setRefundSubmitted(!!val);
    const BACKEND_URL = getBackendUrl();
    const authToken = getAuthToken();
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/group-orders/settlement-status/${groupId}`, {
          headers: {
            'Accept': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
          cache: 'no-store',
        });
        if (!res.ok) {
          setServerDelta(null);
          return;
        }
        const data = await res.json().catch(() => null as any);
        if (!data) {
          setServerDelta(null);
          return;
        }
        if (data.refund_due && Number(data.refund_amount) > 0) {
          setServerDelta(-Math.abs(Number(data.refund_amount)));
          return;
        }
        if (data.settlement_required && Number(data.settlement_amount) > 0) {
          setServerDelta(Math.abs(Number(data.settlement_amount)));
          return;
        }
        // Neither refund nor settlement reported by server. Fall back to client-side delta logic.
        setServerDelta(null);
      } catch {
        setServerDelta(null);
      }
    })();
  }, [isOpen, groupId, token]);

  // Format numbers in Persian/Farsi
  const formatPrice = (price: number) => {
    return Math.abs(price).toLocaleString('fa-IR');
  };

  // Handle modal animations
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable body scroll when modal closes
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
      // Mark as seen; also remove from persistent pending list
      try {
        safeSessionStorage.setItem(`gb-modal-${groupId}`, '1');
        // Persist seen across sessions so it never re-appears unless cleared
        const seenKey = 'gb-seen';
        const rawSeen = safeStorage.getItem(seenKey);
        const seenArr = rawSeen ? JSON.parse(rawSeen) : [];
        const nextSeen = Array.isArray(seenArr) ? Array.from(new Set([...seenArr, String(groupId)])) : [String(groupId)];
        safeStorage.setItem(seenKey, JSON.stringify(nextSeen));
        const key = 'gb-pending';
        const raw = safeStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        if (Array.isArray(list) && list.includes(groupId)) {
          const next = list.filter((x: string) => x !== groupId);
          safeStorage.setItem(key, JSON.stringify(next));
        }
      } catch {}
    }, 300);
  };

  const handleTrackOrder = () => {
    handleClose();
    router.push(`/track/${groupId}`);
  };

  const handleBackToHome = () => {
    handleClose();
    router.push('/');
  };

  // Handle payment for remaining amount
  const handlePayRemainder = () => {
    if (effectiveDelta <= 0 || isPaying) return;
    
    // Skip auth check - just proceed with payment
    
    (async () => {
      try {
        setIsPaying(true);
        // Create settlement payment on backend (leader-only endpoint)
        console.log(`Creating settlement payment for group ID: ${groupId}, delta: ${delta}, isAuthenticated: ${isAuthenticated}, token: ${token ? 'present' : 'missing'}`);
        
        // Use direct backend call with simple endpoint
        const BACKEND_URL = getBackendUrl();
        const authToken = getAuthToken();
        const res = await fetch(`${BACKEND_URL}/api/group-orders/create-settlement-payment/${groupId}`, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
          },
        });
        const data = await res.json().catch(() => ({} as any));
        console.log('Settlement payment response:', { status: res.status, data });
        if (res.status === 401 || res.status === 403) {
          console.error('Auth error:', { status: res.status, data, token: token ? 'present' : 'missing', isAuthenticated });
          alert('برای پرداخت تسویه، ابتدا وارد حساب خود شوید');
          setIsPaying(false);
          return;
        }
        if (!res.ok || !data?.success) {
          const errorMsg = data?.detail || data?.error || 'خطای نامشخص';
          console.error('Settlement payment error:', errorMsg);
          alert(`خطا در ایجاد پرداخت تسویه: ${errorMsg}`);
          setIsPaying(false);
          return;
        }
        const paymentUrl: string | undefined = data.payment_url;
        if (!paymentUrl) {
          alert('آدرس پرداخت نامعتبر است');
          setIsPaying(false);
          return;
        }
        // Mark settlement flow so callback can show confirmation and redirect properly
        safeStorage.setItem('settlement_payment', '1');
        safeStorage.setItem('settlement_group_id', String(groupId));
        // Navigate to bank
        window.location.assign(paymentUrl);
      } catch (e) {
        alert('خطا در اتصال به درگاه پرداخت');
        setIsPaying(false);
      }
    })();
  };

  const handleSubmitRefundCard = async () => {
    // Only allow when effective refund is due
    const effectiveDelta = serverDelta ?? delta;
    if (!(effectiveDelta < 0)) return;
    const cleaned = cardNumber.replace(/[^0-9]/g, '');
    if (cleaned.length < 16) {
      alert('شماره کارت معتبر وارد کنید');
      return;
    }
    try {
      setSubmittingCard(true);
      const BACKEND_URL = getBackendUrl();
      const authToken = getAuthToken();
      const res = await fetch(`${BACKEND_URL}/api/group-orders/submit-refund-card/${groupId}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
        },
        body: new URLSearchParams({ card_number: cleaned }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        alert(data?.detail || data?.error || 'خطا در ثبت کارت');
        setSubmittingCard(false);
        return;
      }
      alert('اطلاعات کارت ثبت شد. پس از بررسی، مبلغ به کارت شما واریز می‌شود.');
      const key = `gb-refund-submitted-${groupId}`;
      safeStorage.setItem(key, String(Date.now()));
      setRefundSubmitted(true);
      try {
        window.dispatchEvent(new CustomEvent('gb-refund-submitted', { detail: { groupId: String(groupId) } }));
      } catch {}
      // Close modal and navigate to groups/orders to reflect updated state
      try { handleClose(); } catch {}
      try { router.push('/groups-orders'); } catch {}
    } catch {
      alert('خطا در اتصال به سرور');
    } finally {
      setSubmittingCard(false);
    }
  };

  const getSettlementMessage = () => {
    const effectiveDelta = serverDelta ?? delta;
    // Force owes state when expected=2 and actual=1 per user report
    try {
      const expected = Number(requiredMembers);
      const actual = Number(actualMembers);
      if (expected === 2 && actual === 1 && effectiveDelta <= 0) {
        // If server didn't send a positive settlement yet, but this specific case is known to require payment,
        // use client delta as fallback (finalLeaderPrice - initialPaid)
        return {
          title: 'باقی‌مانده پرداخت',
          message: `باقی‌مانده پرداخت: ${formatPrice(Math.max(0, delta))} تومان`,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      }
    } catch {}
    const effectiveState: SettlementState = effectiveDelta > 0 ? 'leader_owes' : effectiveDelta < 0 ? 'refund_due' : 'settled';
    switch (effectiveState) {
      case 'settled':
        return {
          title: 'تسویه انجام شد',
          message: 'تسویه انجام شد. پرداخت اضافه‌ای نیاز نیست.',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'leader_owes':
        return {
          title: 'باقی‌مانده پرداخت',
          message: `باقی‌مانده پرداخت: ${formatPrice(effectiveDelta)} تومان`,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'refund_due':
        return refundSubmitted
          ? {
              title: 'پرداخت به کارت شما در صف است',
              message: 'اطلاعات کارت ثبت شد. مبلغ به کارت شما واریز و نتیجه اطلاع‌رسانی خواهد شد.',
              color: 'text-blue-600',
              bgColor: 'bg-blue-50',
              borderColor: 'border-blue-200'
            }
          : {
              title: 'مبلغ قابل بازگشت',
              message: `مبلغ قابل بازگشت: ${formatPrice(effectiveDelta)} تومان`,
              color: 'text-blue-600',
              bgColor: 'bg-blue-50',
              borderColor: 'border-blue-200'
            };
    }
  };

  const settlement = getSettlementMessage();
  const groupRequired = Number(requiredMembers || 0) + 1;
  const groupActual = Number(actualMembers || 0) + 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isAnimating ? 'bg-opacity-40' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Bottom Sheet Modal */}
      <div
        className={`relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-300 ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="text-right">
            <h2 className="text-lg font-semibold text-gray-900">تبریک! گروه با موفقیت تشکیل شد</h2>
            {/* Dynamic explanatory line with friends→group mapping; hide when refund is due to avoid confusion */}
            {(effectiveDelta >= 0) && (
              <p className="mt-1 text-xs text-gray-600 leading-6">
                شما قبلا وجه برای گروه {`${groupRequired.toLocaleString('fa-IR')}`} نفره
                (<span className="font-medium">{`${Number(initialPaid || 0).toLocaleString('fa-IR')}`} تومان</span>) را پرداخت کرده‌اید
                اما گروه {`${groupActual.toLocaleString('fa-IR')}`} نفره تشکیل دادین.{effectiveDelta > 0 ? ' برای ثبت نهایی سفارش لطفا مبلغ باقیمانده را پرداخت نمایید.' : ''}
              </p>
            )}
            {(effectiveDelta < 0) && (
              <p className="mt-1 text-xs text-gray-600 leading-6">
                شما قبلا وجه برای گروه {`${groupRequired.toLocaleString('fa-IR')}`} نفره
                (<span className="font-medium">{`${Number(initialPaid || 0).toLocaleString('fa-IR')}`} تومان</span>) را پرداخت کرده‌اید
                اما گروه {`${groupActual.toLocaleString('fa-IR')}`} نفره تشکیل شد. به خاطر جایزه تجمیع سفارش، مبلغ {`${Math.abs(Number(effectiveDelta)).toLocaleString('fa-IR')}`} تومان به شما برگردانده می‌شود.
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto">
          <GroupBuyResultContent
            settlementTitle={settlement.title}
            settlementMessage={settlement.message}
            settlementColorClass={settlement.color}
            settlementBgClass={settlement.bgColor}
            settlementBorderClass={settlement.borderColor}
            orderSummary={displayOrderSummary || {
              originalPrice: 0,
              groupDiscount: 0,
              finalItemsPrice: 0,
              shippingCost: 0,
              rewardCredit: 0,
              grandTotal: 0,
              amountPaid: 0
            }}
            onPayRemainder={effectiveDelta > 0 ? handlePayRemainder : undefined}
            remainderAmount={effectiveDelta}
          />
          {/* Show refund card input only if final client state said refund_due. */}
          {(effectiveDelta < 0 && !refundSubmitted) && (
            <div className="p-4 border-t border-gray-200" dir="rtl">
              <label className="block text-sm font-medium text-gray-700 mb-2">شماره کارت برای واریز</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="---- ---- ---- ----"
                className="w-full border rounded-lg p-3 text-right"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
              />
              <button
                onClick={handleSubmitRefundCard}
                disabled={submittingCard}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                {submittingCard ? 'در حال ثبت...' : 'ثبت اطلاعات کارت' }
              </button>
              <p className="mt-2 text-xs text-gray-500">پس از تکمیل گروه و بررسی توسط پشتیبانی، مبلغ {formatPrice(Math.abs(delta))} تومان به کارت معرفی‌شده واریز می‌شود.</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 space-y-3">
          {effectiveDelta > 0 ? (
            <button
              onClick={handlePayRemainder}
              disabled={isPaying}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {isPaying ? 'در حال انتقال به درگاه...' : 'پرداخت'}
            </button>
          ) : (
            <button
              onClick={handleTrackOrder}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              پیگیری سفارش
            </button>
          )}
          <button
            onClick={handleBackToHome}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            بازگشت به باهم
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupBuyResultModal;
