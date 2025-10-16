"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Order } from "@/types/order";
import { Group } from "@/types/group";
import { SecondaryPricingTiers } from "@/types/pricing";
import { orderApi, groupApi, pricingApi } from "@/lib/api";

// Components
import SuccessCard from "./_components/SuccessCard";
import PaymentDetails from "./_components/PaymentDetails";
// Secondary groups disabled for now

interface PageData {
  order: Order;
  group: Group;
  pricingTiers: SecondaryPricingTiers;
}

function InviteeSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const [isCountdownExpired, setIsCountdownExpired] = useState(false);

  const orderIdParam = searchParams.get("orderId");
  const groupIdParam = searchParams.get("groupId");
  const authorityParam = searchParams.get("authority") || searchParams.get("Authority");
  const [inviteAuthority, setInviteAuthority] = useState<string | null>(authorityParam || null);
  
  // OVERRIDE Next.js router to prevent invite redirects
  useEffect(() => {
    const originalPush = router.push;
    const originalReplace = router.replace;
    
    // @ts-ignore
    router.push = function(href, options) {
      if (typeof href === 'string' && href.includes('/invite')) {
        console.warn('[InviteeSuccess] BLOCKED Next.js router.push to invite page:', href);
        return Promise.resolve(true);
      }
      return originalPush.call(this, href, options);
    };
    
    // @ts-ignore
    router.replace = function(href, options) {
      if (typeof href === 'string' && href.includes('/invite')) {
        console.warn('[InviteeSuccess] BLOCKED Next.js router.replace to invite page:', href);
        return Promise.resolve(true);
      }
      return originalReplace.call(this, href, options);
    };
    
    return () => {
      // @ts-ignore
      router.push = originalPush;
      // @ts-ignore
      router.replace = originalReplace;
    };
  }, [router]);

  // NOTE: Previously this page redirected to `/invite`. We keep users here with a
  // dedicated, polished success experience and clear next actions.

  // FORCE STAY ON SUCCESS PAGE - Prevent any redirects
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const currentUrl = window.location.href;
      
      console.log('[InviteeSuccess] Current path:', currentPath, 'Full URL:', currentUrl);
      
      // Set a flag to indicate we've successfully reached the success page
      try {
        localStorage.setItem('payment_success_reached', 'true');
      } catch {}
      
      // OVERRIDE any navigation attempts to invite page only (allow same-page reload)
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;
      
      window.history.pushState = function(state, title, url) {
        if (typeof url === 'string' && url.includes('/invite')) {
          console.warn('[InviteeSuccess] BLOCKED redirect to invite page:', url);
          return;
        }
        return originalPushState.call(this, state, title, url);
      };
      
      window.history.replaceState = function(state, title, url) {
        if (typeof url === 'string' && url.includes('/invite')) {
          console.warn('[InviteeSuccess] BLOCKED redirect to invite page:', url);
          return;
        }
        return originalReplaceState.call(this, state, title, url);
      };
      
      // Do not override window.location.href entirely; allow reloads to work normally
      
      // Cleanup function to restore original methods
      return () => {
        window.history.pushState = originalPushState;
        window.history.replaceState = originalReplaceState;
      };
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      // Debug logging to understand refresh behavior
      console.log('[InviteeSuccess] Loading data with params:', {
        orderIdParam,
        groupIdParam,
        authorityParam,
        currentUrl: typeof window !== 'undefined' ? window.location.href : 'SSR'
      });

      let resolvedOrderId = orderIdParam || "";
      let resolvedGroupId = groupIdParam || "";

      // Resolve by authority if orderId is missing
      if (!resolvedOrderId && authorityParam) {
        console.log('[InviteeSuccess] Resolving orderId by authority:', authorityParam);
        try {
          const res = await fetch(`/api/payment/order/${authorityParam}`);
          const j = await res.json();
          if (j?.success && j.order?.id) {
            resolvedOrderId = String(j.order.id);
            resolvedGroupId = String(j.order.group_order_id || j.order.groupId || "");
            console.log('[InviteeSuccess] Resolved:', { resolvedOrderId, resolvedGroupId });
          }
        } catch (err) {
          console.error('[InviteeSuccess] Failed to resolve by authority:', err);
        }
      }

      if (!resolvedOrderId) {
        console.error('[InviteeSuccess] No orderId found, showing error');
        setError("شناسه سفارش یافت نشد");
        setLoading(false);
        return;
      }

      try {
        // Load all data in parallel
        const [order, maybeGroup, pricingTiers] = await Promise.all([
          orderApi.getOrder(resolvedOrderId),
          resolvedGroupId ? groupApi.getGroup(resolvedGroupId) : Promise.resolve(null as any),
          pricingApi.getSecondaryPricingTiers(resolvedOrderId),
        ]);

        // Validate order status (case-insensitive) or presence of paid markers
        const isPaid =
          (order.status && order.status.toLowerCase() === "paid") ||
          !!order.paidAt ||
          !!order.payment?.bankRef;
        if (!isPaid) {
          // Show page anyway but warn in console; UX should still allow CTA within 24h
          console.warn("Order not marked as paid; continuing for UX.");
        }

        const group = maybeGroup || { expiresAt: undefined } as any;
        setData({ order, group, pricingTiers });
      } catch (err) {
        console.error("Failed to load data:", err);
        // Ensure we stay on success page even on error - don't redirect to invite
        setError(err instanceof Error ? err.message : "خطا در بارگذاری اطلاعات");
        console.log('[InviteeSuccess] Error occurred but staying on success page');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orderIdParam, groupIdParam, authorityParam]);

  // Try to recover authority for invite link from localStorage when not in URL
  useEffect(() => {
    if (inviteAuthority) return;
    if (!data?.order?.id) return;
    if (typeof window === 'undefined') return;
    try {
      const prefix = 'processed_';
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.isInvited && String(parsed.orderId) === String(data.order.id)) {
            const auth = key.slice(prefix.length);
            if (auth) {
              setInviteAuthority(auth);
              break;
            }
          }
        } catch {}
      }
    } catch {}
  }, [data?.order?.id, inviteAuthority]);

  // const handleCountdownExpired = () => {
  //   setIsCountdownExpired(true);
  // };

  // const handleGroupCreated = (newGroup: Group) => {
  //   if (data) {
  //     setData({ ...data, group: newGroup });
  //   }
  // };

  // Calculate countdown target (24h from payment time)
  // const getCountdownTarget = (): string | null => {
  //   if (!data) return null;
  //   if (data.group?.expiresAt) return data.group.expiresAt;
  //   const base = data.order.paidAt ? new Date(data.order.paidAt) : new Date();
  //   const paymentTime = base;
  //   const targetTime = new Date(paymentTime.getTime() + 24 * 60 * 60 * 1000);
  //   return targetTime.toISOString();
  // };

  // const countdownTarget = getCountdownTarget();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">خطا</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* DEBUG INFO - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-100 p-2 text-xs text-blue-800 border-b">
          🔧 Debug: Success Page | Path: {typeof window !== 'undefined' ? window.location.pathname : 'SSR'} | 
          OrderId: {orderIdParam} | Authority: {authorityParam}
        </div>
      )}
      
      {/* Main Content */}
      <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
        {/* Success Hero */}
        <div className="px-4 pt-8 pb-6 bg-gradient-to-b from-emerald-50 to-transparent text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-9 h-9 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-lg font-extrabold text-gray-900 mb-1">پرداخت موفق</h1>
          <p className="text-gray-600 text-sm">سفارش شما با موفقیت ثبت شد</p>
          
          {/* FORCE STAY MESSAGE - Only in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-3 p-2 bg-green-100 rounded text-green-800 text-xs">
              ✅ صفحه موفقیت - هیچ redirect نخواهد شد!
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 space-y-6">
          {/* Success Card */}
          <SuccessCard order={data.order} />

          {/* Payment Details */}
          <PaymentDetails order={data.order} />

          {/* Guidance Box */}
          <div className="rounded-2xl p-4 text-center border border-gray-200">
            <h2 className="text-gray-800 font-bold text-base mb-1">پرداخت شما با موفقیت ثبت شد</h2>
            <div className="text-gray-600 text-sm">برای پیگیری وضعیت، به صفحه سفارش‌ها بروید.</div>
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/groups-orders" className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
              مشاهده سفارش‌ها
            </Link>
            {inviteAuthority ? (
              <button
                onClick={() => router.push(`/invite?authority=${encodeURIComponent(inviteAuthority)}`)}
                className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                مبلغ پرداختیت رو پس بگیر!
              </button>
            ) : (
              <button
                disabled
                className="inline-flex items-center justify-center px-4 py-3 rounded-xl border border-gray-200 text-gray-400 text-sm font-semibold cursor-not-allowed"
              >
                در حال آماده‌سازی...
              </button>
            )}
          </div>
        </div>
      </div>

      
    </div>
  );
}

export default function InviteeSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-600">در حال بارگذاری…</p></div>}>
      <InviteeSuccessContent />
    </Suspense>
  );
}