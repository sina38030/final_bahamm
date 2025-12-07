'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { groupApi, withIdempotency } from '@/lib/api';
import type { Group } from '@/types/group';
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
  const [basketSheetOpen, setBasketSheetOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresAtISO, setExpiresAtISO] = useState<string | null>(null);
  const [expiryMs, setExpiryMs] = useState<number | null>(null);
  const [inviteDisabled, setInviteDisabled] = useState(false);
  const [groupStatus, setGroupStatus] = useState<string | null>(null);
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
          
          
          // Time will be set from /api/groups/{inviteCode} below to persist across refreshes
        } else {
          // If order not found yet and we haven't retried too many times, retry
          if (retryCount < 3) {
            console.log(`[Invite] Order not ready yet, retrying in ${1000 * (retryCount + 1)}ms (attempt ${retryCount + 1}/3)`);
            setTimeout(() => fetchOrder(retryCount + 1), 1000 * (retryCount + 1));
            return;
          }
          setError(data.error || 'خطا در دریافت اطلاعات سفارش');
          setLoading(false);
        }
      } catch (err) {
        // On network error, retry once
        if (retryCount < 1) {
          console.log('[Invite] Network error, retrying once...');
          setTimeout(() => fetchOrder(retryCount + 1), 1500);
          return;
        }
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
          try { setShareSheetOpen(false); } catch {}
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

  // If a secondary group gets created here, fetch its live participants to reflect real progress
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        if (!createdGroup) {
          return;
        }
        
        const idOrCode = String(createdGroup.id || '').trim() || ((): string => {
          try {
            const url = createdGroup.shareUrl || '';
            const m = url.match(/invite=([^&]+)/);
            return m && m[1] ? decodeURIComponent(m[1]) : '';
          } catch { return ''; }
        })();
        if (!idOrCode) return;
        const res = await fetch(`${API_BASE_URL}/groups/${encodeURIComponent(idOrCode)}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (abort) return;
        markSecondaryFlow(data, 4);
        try {
          const participants = Array.isArray((data as any)?.participants) ? (data as any).participants : [];
          const paidCount = participants.reduce((acc: number, p: any) => {
            try {
              const isLeader = p?.isLeader === true || p?.is_leader === true || p?.role === 'leader';
              const statusStr = String(p?.status || '').toLowerCase();
              const paid = p?.paid === true || statusStr.includes('paid') || statusStr.includes('success');
              return acc + (!isLeader && paid ? 1 : 0);
            } catch { return acc; }
          }, 0);
          setNonLeaderPaid(Math.max(0, paidCount));
          setRequiredMembers(4);
          const secondaryTotals = computeSecondaryTotals(
            paidCount,
            (() => {
              const snapshotPricing = (data as any)?.pricing;
              if (snapshotPricing && Number.isFinite(Number(snapshotPricing.originalTotal))) {
                const base = Number(snapshotPricing.originalTotal) || 0;
                if (base > 0) return base;
              }
              const basketArr: any[] = Array.isArray((data as any)?.basket) ? (data as any).basket : [];
              let total = 0;
              if (basketArr.length > 0) {
                basketArr.forEach((it: any) => {
                  const qty = Number(it.qty ?? it.quantity ?? 1) || 1;
                  const unit = Number(it.unitPrice ?? it.unit_price ?? it.market_price ?? it.original_price ?? 0) || 0;
                  total += unit * qty;
                });
              }
              if (total === 0 && order) {
                total = (order.items || []).reduce((sum, item) => {
                  const productId = item.product_id || item.id;
                  const prices = getProductPrices(productId);
                  return sum + prices.solo_price * (item.quantity || 1);
                }, 0);
              }
              if (total === 0 && order?.total_amount) {
                total = Number(order.total_amount) || 0;
              }
              return total;
            })()
          );

          if (secondaryTotals.solo > 0) {
            setOriginalTotal(secondaryTotals.solo);
            setCurrentTotal(secondaryTotals.current);
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
        } catch {}
      } catch {}
    })();
    return () => { abort = true; };
  }, [createdGroup]);

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
          try { setShareSheetOpen(false); } catch {}
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
              basketArr.forEach((it: any) => {
                const qty = Number(it.qty ?? it.quantity ?? 1) || 1;
                const unit = Number(it.unitPrice ?? it.unit_price ?? it.market_price ?? it.original_price ?? 0) || 0;
                const disc = (() => {
                  const direct = Number(it.discountedUnitPrice ?? it.discounted_unit_price ?? it.friend_price ?? it.current_price ?? NaN);
                  if (!Number.isNaN(direct)) return direct;
                  const f1 = Number(it.friend_1_price ?? NaN);
                  const f2 = Number(it.friend_2_price ?? NaN);
                  const f3 = Number(it.friend_3_price ?? NaN);
                  const tier = Math.max(0, Math.min(3, paidCount));
                  if (tier >= 3 && Number.isFinite(f3)) return f3;
                  if (tier === 2 && Number.isFinite(f2)) return f2;
                  if (tier === 1 && Number.isFinite(f1)) return f1;
                  return unit;
                })();
                candOrig += unit * qty;
                candCurr += disc * qty;
              });
            }

            // Fallback to order items when server totals are zero or missing and order is available
            if ((candOrig <= 0 || candCurr < 0) && order) {
              const { solo, current } = computeTotalsForTier(Math.max(0, Math.min(3, paidCount)), false);
              if (solo > 0) {
                candOrig = solo;
                candCurr = current;
              }
            }

            // Final guard: if still zero but order has a total_amount, use it to avoid 0 UI
            if (order && candCurr <= 0 && Number(order.total_amount) > 0) {
              candCurr = Number(order.total_amount);
              if (candOrig <= 0) candOrig = candCurr;
            }

            // Only mark ready when we have a sensible original total
            if (candOrig > 0) {
              setOriginalTotal(candOrig);
              setCurrentTotal(Math.max(0, candCurr));
              setProgressReady(true);
            } else {
              setProgressReady(false);
            }
          } catch {
            if (order) {
              const { solo, current } = computeTotalsForTier(1, false);
              if (solo > 0) {
                setOriginalTotal(solo);
                setCurrentTotal(current);
                setRequiredMembers(3);
                setNonLeaderPaid(0);
                setProgressReady(true);
              } else {
                setProgressReady(false);
              }
            } else {
              setProgressReady(false);
            }
          }
        }
        // Normalize expiry to absolute milliseconds like track/landingM (supports snake_case too)
        const expiresAtMsCamel = (data as any)?.expiresAtMs;
        const expiresAtMsSnake = (data as any)?.expires_at_ms;
        const expiresAtCamel = (data as any)?.expiresAt;
        const expiresAtSnake = (data as any)?.expires_at;
        const expiresInSecondsCamel = (data as any)?.expiresInSeconds;
        const expiresInSecondsSnake = (data as any)?.expires_in_seconds;
        const remainingSecondsCamel = (data as any)?.remainingSeconds;
        const remainingSecondsSnake = (data as any)?.remaining_seconds;
        const serverNowMsCamel = (data as any)?.serverNowMs;
        const serverNowMsSnake = (data as any)?.server_now_ms || (data as any)?.server_now;

        if (expiresAtMsCamel != null || expiresAtMsSnake != null) {
          const srv = Number(serverNowMsCamel != null ? serverNowMsCamel : serverNowMsSnake);
          const clientNow = Date.now();
          const skew = Number.isFinite(srv) && srv > 0 ? (clientNow - srv) : 0;
          const target = (Number(expiresAtMsCamel != null ? expiresAtMsCamel : expiresAtMsSnake) || 0) + skew;
          if (target > 0) {
            setExpiryMs(target);
            setExpiresAtISO(null);
          }
        } else if (remainingSecondsCamel != null || remainingSecondsSnake != null) {
          const secs = Math.max(0, Number(remainingSecondsCamel != null ? remainingSecondsCamel : remainingSecondsSnake) || 0);
          const target = Date.now() + secs * 1000;
          setExpiryMs(target);
          setExpiresAtISO(null);
        } else if (expiresInSecondsCamel != null || expiresInSecondsSnake != null) {
          const secs = Math.max(0, Number(expiresInSecondsCamel != null ? expiresInSecondsCamel : expiresInSecondsSnake) || 0);
          const target = Date.now() + secs * 1000;
          setExpiryMs(target);
          setExpiresAtISO(null);
        } else if (expiresAtCamel || expiresAtSnake) {
          const raw = String(expiresAtCamel || expiresAtSnake);
          const parsed = Date.parse(raw);
          if (!Number.isNaN(parsed)) {
            setExpiryMs(parsed);
            setExpiresAtISO(raw);
          } else {
            const normalized = raw.replace(' ', 'T');
            // Check if timezone info is missing, if so, assume Tehran time (+03:30)
            if (!/Z|[+-]\d{2}:?\d{2}$/.test(normalized)) {
              const tehranTime = Date.parse(normalized + '+03:30');
              if (!Number.isNaN(tehranTime)) {
                setExpiryMs(tehranTime);
                setExpiresAtISO(new Date(tehranTime).toISOString());
              }
            } else {
              const utc = Date.parse(normalized);
              if (!Number.isNaN(utc)) {
                setExpiryMs(utc);
                setExpiresAtISO(new Date(utc).toISOString());
              }
            }
          }
        } else {
          // No expiry provided by backend; do not set a default. Keep previous value or hide timer.
        }
      } catch {}
    })();
    return () => { abort = true; };
  }, [order, searchParams]);

  

  // Unified countdown: derive seconds remaining from absolute expiry
  useEffect(() => {
    if (!expiryMs) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiryMs]);

  

  // (removed ms ticker)

  // Format timer display (24:00:00 format)
  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return toFa(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    );
  };

  // Use prices coming from backend product payload to match admin-full
  const getProductPrices = (productId: number) => {
    const item = order?.items.find(i => (i.product_id || i.id) === productId);
    const p = item?.product as any;
    const market = Number(p?.market_price ?? 0);
    const f1 = Number(p?.friend_1_price ?? 0);
    const f2 = Number(p?.friend_2_price ?? 0);
    const f3 = Number(p?.friend_3_price ?? 0);
    const base = Number(item?.base_price ?? 0);
    // Robust fallbacks to avoid zero values
    const solo_price = (market > 0 ? market : (f1 > 0 ? f1 : (f2 > 0 ? f2 : (f3 > 0 ? f3 : (base > 0 ? base : 0)))));
    const friend_1_price = (f1 > 0 ? f1 : (f2 > 0 ? f2 : (f3 > 0 ? f3 : (market > 0 ? market : (base > 0 ? base : 0)))));
    const friend_2_price = (f2 > 0 ? f2 : (f3 > 0 ? f3 : (f1 > 0 ? f1 : (market > 0 ? market : (base > 0 ? base : 0)))));
    const friend_3_price = (f3 > 0 ? f3 : (f2 > 0 ? f2 : (f1 > 0 ? f1 : (market > 0 ? market : (base > 0 ? base : 0)))));
    return {
      solo_price,
      friend_1_price,
      friend_2_price,
      friend_3_price,
      original_price: solo_price,
    };
  };

  const getProductFriendPrice = (productId: number) => getProductPrices(productId).friend_1_price;

  const computeSecondaryTotals = (friendsJoined: number, basketValue: number) => {
    if (basketValue <= 0) return { solo: 0, current: 0 };
    const cappedFriends = Math.max(0, Math.min(friendsJoined, 3));
    const quarter = basketValue / 4;
    const current = friendsJoined >= 4 ? 0 : basketValue - cappedFriends * quarter;
    return { solo: basketValue, current: Math.max(0, current) };
  };

  // Compute totals for an achieved tier based on paid non-leaders
  const computeTotalsForTier = (tier: number, isSecondaryGroup = false) => {
    if (isSecondaryGroup) {
      const basketValue = (order?.items || []).reduce((sum, item) => {
        const productId = item.product_id || item.id;
        const prices = getProductPrices(productId);
        const quantity = item.quantity || 1;
        return sum + prices.solo_price * quantity;
      }, 0);
      return computeSecondaryTotals(tier, basketValue);
    }

    let solo = 0;
    let t1 = 0;
    let t2 = 0;
    let t3 = 0;
    if (order?.items && order.items.length > 0) {
      order.items.forEach(item => {
        const productId = item.product_id || item.id;
        const prices = getProductPrices(productId);
        const quantity = item.quantity || 1;
        solo += prices.solo_price * quantity;
        t1 += prices.friend_1_price * quantity;
        t2 += prices.friend_2_price * quantity;
        t3 += prices.friend_3_price * quantity;
      });
    }
    const current = tier >= 3 ? t3 : tier === 2 ? t2 : tier === 1 ? t1 : solo;
    return { solo, current };
  };

  // (toggle UI removed)
 

  // Share functions
  const handleShare = (app: string) => {
    if (!order || inviteDisabled) return;

    const landingUrl = resolvedInviteLink;
    if (!landingUrl) return;

    // Close sheet before navigating to avoid popup blockers on some browsers
    try { setShareSheetOpen(false); } catch {}

    // Use Web Share API when available (better on mobile)
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any)
        .share({
          title: 'خرید گروهی با هم',
          text: 'بیا با هم سبد رو بخریم تا رایگان بگیریم!',
          url: landingUrl,
        })
        .catch(() => {});
      return;
    }

    const shareMessage = 'بیا با هم سبد رو بخریم تا رایگان بگیریم!';
    const inviteURL = encodeURIComponent(landingUrl);
    const inviteMsg = encodeURIComponent(shareMessage);

    let url = '#';
    switch (app) {
      case 'telegram':
        // Generate share URL using utility
        url = generateShareUrl('telegram', landingUrl, shareMessage);
        // Try opening Telegram app first, then fallback to web
        try {
          const tgApp = `tg://msg_url?url=${inviteURL}&text=${inviteMsg}`;
          const winApp = window.open(tgApp, '_blank', 'noopener,noreferrer');
          setTimeout(() => {
            const winWeb = window.open(url, '_blank', 'noopener,noreferrer');
            if (!winWeb) window.location.href = url;
          }, 300);
          if (!winApp) {
            const winWeb = window.open(url, '_blank', 'noopener,noreferrer');
            if (!winWeb) window.location.href = url;
          }
        } catch {
          const winWeb = window.open(url, '_blank', 'noopener,noreferrer');
          if (!winWeb) window.location.href = url;
        }
        return;
      case 'whatsapp':
        url = generateShareUrl('whatsapp', landingUrl, shareMessage);
        break;
      case 'instagram':
        url = generateShareUrl('instagram', landingUrl);
        break;
    }
    try {
      const newWin = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newWin) {
        window.location.href = url;
      }
    } catch (_) {
      window.location.href = url;
    }
  };

  // Precompute share URLs for direct-anchor approach
  const shareMsg = 'بیا با هم سبد رو بخریم تا رایگان بگیریم!';

  const resolvedInviteLink = useMemo(() => {
    if (!order) return '';
    
    // Prefer newly created secondary group link when present
    if (createdGroup && createdGroup.shareUrl) {
      // If we have a share URL, we might want to regenerate it for current environment
      const code = extractInviteCode(createdGroup.shareUrl);
      if (code) return generateInviteLink(code);
      return createdGroup.shareUrl;
    }
    
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
    return generateInviteLink(inviteCode);
  }, [order, createdGroup]);

  // Include the link inside the text too for clients that ignore the url param
  const encodedMsg = encodeURIComponent(`${shareMsg} ${resolvedInviteLink || ''}`.trim());
  const shareText = `${shareMsg} ${resolvedInviteLink || ''}`.trim();
  const encodedLanding = encodeURIComponent(resolvedInviteLink || '');

  const copyInviteLink = async () => {
    try {
      if (!resolvedInviteLink) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(resolvedInviteLink);
      } else {
        const ta = document.createElement('textarea');
        ta.value = resolvedInviteLink;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {
      setCopied(false);
    }
  };

  // Close sheets when clicking outside
  const closeSheets = () => {
    setBasketSheetOpen(false);
    setShareSheetOpen(false);
  };

  const ensureSecondaryGroupThenShare = async () => {
    try {
      setCreateError(null);
      
      // If we already created a group, just open share
      if (createdGroup && createdGroup.shareUrl) {
        setShareSheetOpen(true);
        return;
      }
      // Always create (or reuse) a secondary group for invited user's share
      if (!order) { setShareSheetOpen(true); return; }
      if (creating) return;
      setCreating(true);
      const paidAtStr = (order as any)?.paidAt || (order as any)?.payment_ref_id ? (order as any)?.paidAt : '';
      const createdAtStr = (order as any)?.created_at || (order as any)?.createdAt || '';
      const base = paidAtStr ? new Date(paidAtStr) : (createdAtStr ? new Date(createdAtStr) : new Date());
      const expiryTime = new Date(base.getTime() + 24 * 60 * 60 * 1000);
      const payload = {
        kind: 'secondary' as const,
        source_group_id: undefined,
        source_order_id: order.id,
        expires_at: expiryTime.toISOString(),
      };
      // Include auth header if available (idempotent on backend)
      const headers = withIdempotency(token ? { 'Authorization': `Bearer ${token}` } as HeadersInit : {});
      const g = await groupApi.createSecondaryGroup(payload, headers);
      setCreatedGroup(g);
      // Open share sheet with the newly created group's shareUrl
      setShareSheetOpen(true);
      return;
    } catch (e: any) {
      // Suppress raw backend error details; just open share sheet
      try { console.warn('createSecondaryGroup failed:', e?.message || e); } catch {}
      // Do not show raw error to user
      // If unauthenticated, at least open existing share so user can proceed
      try { setShareSheetOpen(true); } catch {}
    } finally {
      setCreating(false);
    }
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

      <div
        className={`invite-page ${(basketSheetOpen || shareSheetOpen) ? 'sheet-open' : ''}`}
        onClick={(e) => {
          if ((basketSheetOpen || shareSheetOpen) && e.target === e.currentTarget) {
            closeSheets();
          }
        }}
      >
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

        {/* Group progress + explanation */}
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
            className={`invite-btn${(creating || inviteDisabled) ? ' disabled' : ''}`}
            onClick={ensureSecondaryGroupThenShare}
            disabled={creating || inviteDisabled}
            aria-disabled={creating || inviteDisabled}
            title={'اشتراک‌گذاری لینک دعوت'}
          >
             {creating ? 'در حال آماده‌سازی...' : 'دعوت دوستان'}
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
          {(order.items || []).map((item, index) => {
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
                  {(() => {
                    const productId = item.product_id || item.id;
                    const friendPrice = getProductFriendPrice(productId);
                    const totalPrice = friendPrice * item.quantity;
                    
                    return (
                      <>
                        {item.product.market_price > friendPrice && (
                          <s>{toFa(Math.round(item.product.market_price * item.quantity).toLocaleString())}&nbsp;تومان</s>
                        )}
                        <span className="new">{toFa(Math.round(totalPrice).toLocaleString())}&nbsp;تومان</span>
                      </>
                    );
                  })()}
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
        {/* Always show the raw invite link with copy + open options */}
        <div className="share-direct">
          <label>لینک دعوت</label>
          <div className="copy-row">
            <input
              type="text"
              readOnly
              value={resolvedInviteLink || ''}
              onFocus={(e) => (e.currentTarget as HTMLInputElement).select()}
            />
            <button onClick={copyInviteLink}>کپی</button>
          </div>
          {resolvedInviteLink && (
            <a
              className="open-link"
              href={resolvedInviteLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShareSheetOpen(false)}
            >
              باز کردن لینک دعوت
            </a>
          )}
          {copied && <small className="copied-hint">لینک کپی شد ✅</small>}
        </div>
        <div className="share-apps">
          {/* Telegram: always try tg:// deep link first; fallback to web share */}
          <a
            href={`https://t.me/share/url?url=${encodedLanding}&text=${encodedMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              try { setShareSheetOpen(false); } catch {}
              e.preventDefault();
              const appUrl = `tg://msg?text=${encodeURIComponent(shareText)}`;
              let deepLinkTried = false;
              try {
                (window as any).location.href = appUrl;
                deepLinkTried = true;
              } catch {}
              // Fallback to web share after short delay (if app not installed)
              setTimeout(() => {
                try {
                  window.open(`https://t.me/share/url?url=${encodedLanding}&text=${encodedMsg}`, '_blank', 'noopener,noreferrer');
                } catch {
                  (window as any).location.href = `https://t.me/share/url?url=${encodedLanding}&text=${encodedMsg}`;
                }
              }, deepLinkTried ? 500 : 300);
            }}
          >
            <i className="fa-brands fa-telegram"></i>
            <span>تلگرام</span>
          </a>
          {/* WhatsApp: try app deep link, then fallback to wa.me */}
          <a
            href={`https://wa.me/?text=${encodedMsg}%20${encodedLanding}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              try { setShareSheetOpen(false); } catch {}
              const appUrl = `whatsapp://send?text=${encodedMsg}%20${encodedLanding}`;
              try { (window as any).location.href = appUrl; } catch {}
              setTimeout(() => {
                try { window.open(`https://wa.me/?text=${encodedMsg}%20${encodedLanding}`, '_blank', 'noopener,noreferrer'); } catch {
                  (window as any).location.href = `https://wa.me/?text=${encodedMsg}%20${encodedLanding}`;
                }
              }, 400);
            }}
          >
            <i className="fa-brands fa-whatsapp"></i>
            <span>واتساپ</span>
          </a>
          {/* Instagram: web fallback (app deep links are limited) */}
          <a
            href={`https://www.instagram.com/?url=${encodedLanding}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { try { setShareSheetOpen(false); } catch {} }}
          >
            <i className="fa-brands fa-instagram"></i>
            <span>اینستاگرام</span>
          </a>
        </div>
      </aside>

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
    <>
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
      
    </>
  );
}