"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Order } from "@/types/order";
import { Group } from "@/types/group";
// import { SecondaryPricingTiers } from "@/types/pricing";
import { orderApi, groupApi } from "@/lib/api"; // pricingApi removed - secondary groups disabled
import { safeStorage } from "@/utils/safeStorage";
import { useAuth } from "@/contexts/AuthContext";

// Components
import PaymentDetails from "./_components/PaymentDetails";

// Helper functions for countdown timer
const formatTimer = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const toFa = (val: string | number) => String(val).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
// Secondary groups disabled for now

interface PageData {
  order: Order;
  group: Group;
  // pricingTiers: SecondaryPricingTiers; // Secondary groups disabled
}

function InviteeSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth() as any;
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCreatingSecondaryGroup, setIsCreatingSecondaryGroup] = useState(false);
  // const [isCountdownExpired, setIsCountdownExpired] = useState(false);

  const orderIdParam = searchParams.get("orderId");
  const groupIdParam = searchParams.get("groupId");
  const authorityParam = searchParams.get("authority") || searchParams.get("Authority");
  const [inviteAuthority, setInviteAuthority] = useState<string | null>(authorityParam || null);
  
  // Countdown timer state for secondary group creation window (24 hours from payment)
  const [expiryMs, setExpiryMs] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState<boolean>(false);

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
        // Show error instead of redirecting - user can retry or go back
        setError("شناسه سفارش یافت نشد");
        setLoading(false);
        return;
      }

      try {
        // Load all data in parallel - no timeout, just wait for it
        // Secondary groups disabled - removed pricingApi call
        const [order, maybeGroup] = await Promise.all([
          orderApi.getOrder(resolvedOrderId),
          resolvedGroupId ? groupApi.getGroup(resolvedGroupId) : Promise.resolve(null as any),
          // pricingApi.getSecondaryPricingTiers(resolvedOrderId), // Disabled
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
        setData({ order, group }); // pricingTiers removed - secondary groups disabled
      } catch (err) {
        console.error("Failed to load data:", err);
        // Only show error if data truly fails - don't redirect automatically
        const errorMsg = err instanceof Error ? err.message : "خطا در بارگذاری اطلاعات";
        setError(errorMsg);
        console.log('[InviteeSuccess] Error occurred, showing error message');
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
      // First try to get from URL if available
      const urlAuth = authorityParam;
      if (urlAuth) {
        setInviteAuthority(urlAuth);
        return;
      }
      
      const prefix = 'processed_';
      for (let i = 0; i < safeStorage.length; i++) {
        const key = safeStorage.key(i);
        if (!key || !key.startsWith(prefix)) continue;
        const raw = safeStorage.getItem(key);
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
  }, [data?.order?.id, inviteAuthority, authorityParam]);

  // Calculate expiry time (24 hours from payment) when data is loaded
  useEffect(() => {
    if (!data?.order) return;
    
    // Calculate expiry based on paid_at + 24 hours
    const paidAtStr = data.order.paidAt;
    if (paidAtStr) {
      const paidAtMs = Date.parse(paidAtStr);
      if (!isNaN(paidAtMs)) {
        const calculatedExpiry = paidAtMs + 24 * 60 * 60 * 1000; // 24 hours
        setExpiryMs(calculatedExpiry);
        
        // Check if already expired
        if (calculatedExpiry <= Date.now()) {
          setTimerExpired(true);
          setTimeLeft(0);
        }
      }
    }
  }, [data?.order]);

  // Update countdown timer every second
  useEffect(() => {
    if (!expiryMs) return;
    
    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff === 0) {
        setTimerExpired(true);
      }
    };
    
    // Initial update
    updateTimer();
    
    // Update every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [expiryMs]);

  // Show bottom sheet after 1 second
  useEffect(() => {
    if (!data || loading) return;

    const timer = setTimeout(() => {
      setIsSheetOpen(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [data, loading]);

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
        </div>

        {/* Content */}
        <div className="px-4 space-y-6">
          {/* Payment Details */}
          <PaymentDetails order={data.order} />

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-3">
            <Link href={`/order/${data.order.id}`} className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-white text-gray-700 text-sm font-semibold border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
              جزئیات سفارش
            </Link>
            {data?.order?.id && !timerExpired ? (
              <button
                onClick={async () => {
                  if (isCreatingSecondaryGroup) return;
                  setIsCreatingSecondaryGroup(true);
                  try {
                    // Create secondary group and redirect to secondary invite page
                    const response = await fetch('/api/group-orders/create-secondary', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({ source_order_id: data.order.id }),
                    });
                    const result = await response.json();
                    if (result.success && result.group_order_id) {
                      router.push(`/secondary_invite?group_id=${result.group_order_id}&from=created`);
                    } else {
                      // Fallback to original invite page
                      if (inviteAuthority) {
                        router.push(`/invite?authority=${encodeURIComponent(inviteAuthority)}`);
                      }
                    }
                  } catch (err) {
                    console.error('Error creating secondary group:', err);
                    if (inviteAuthority) {
                      router.push(`/invite?authority=${encodeURIComponent(inviteAuthority)}`);
                    }
                  } finally {
                    setIsCreatingSecondaryGroup(false);
                  }
                }}
                disabled={isCreatingSecondaryGroup}
                className="inline-flex flex-col items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-bold shadow-md hover:from-pink-600 hover:to-purple-700 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:shadow-none disabled:transform-none"
              >
                <span>{isCreatingSecondaryGroup ? 'در حال ایجاد...' : 'مبلغ پرداختیت رو پس بگیر!'}</span>
                {!isCreatingSecondaryGroup && typeof timeLeft === 'number' && timeLeft > 0 && (
                  <span className="text-[10px] opacity-90 mt-0.5">⏰ {toFa(formatTimer(timeLeft))}</span>
                )}
              </button>
            ) : data?.order?.id && timerExpired ? (
              <button
                disabled
                className="inline-flex items-center justify-center px-4 py-3 rounded-xl border border-gray-200 text-gray-400 text-sm font-semibold cursor-not-allowed"
              >
                زمان منقضی شد
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

      {/* Bottom Sheet */}
      {isSheetOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
            onClick={() => setIsSheetOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 h-1/2 bg-white rounded-t-3xl z-50 transform transition-transform duration-300 ease-out">
            <div className="w-full max-w-md mx-auto h-full">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>

              {/* Content */}
              <div className="flex flex-col h-full px-6 pb-6">
                <div className="flex-1 space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    دوستات رو دعوت کن و مبلغی که الان پرداخت کردی رو پس بگیر!!
                  </h3>
                  <p className="text-gray-600 text-sm">
                    با دعوت دوستانت به گروه، مبلغ پرداختیت رو پس بگیر
                  </p>
                </div>
                </div>

                <div className="space-y-3">
                  {!timerExpired ? (
                    <button
                      onClick={async () => {
                        if (isCreatingSecondaryGroup || !data?.order?.id) return;
                        setIsCreatingSecondaryGroup(true);
                        try {
                          setIsSheetOpen(false);
                          // Create secondary group and redirect to secondary invite page
                          const response = await fetch('/api/group-orders/create-secondary', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({ source_order_id: data.order.id }),
                          });
                          const result = await response.json();
                          if (result.success && result.group_order_id) {
                            router.push(`/secondary_invite?group_id=${result.group_order_id}&from=created`);
                          } else {
                            // Fallback to original invite page
                            if (inviteAuthority) {
                              router.push(`/invite?authority=${encodeURIComponent(inviteAuthority)}`);
                            }
                          }
                        } catch (err) {
                          console.error('Error creating secondary group:', err);
                          if (inviteAuthority) {
                            router.push(`/invite?authority=${encodeURIComponent(inviteAuthority)}`);
                          }
                        } finally {
                          setIsCreatingSecondaryGroup(false);
                        }
                      }}
                      disabled={isCreatingSecondaryGroup}
                      className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-4 rounded-xl font-semibold text-sm hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 flex flex-col items-center"
                    >
                      <span>{isCreatingSecondaryGroup ? 'در حال ایجاد گروه...' : 'مبلغ پرداختیت رو پس بگیر!'}</span>
                      {!isCreatingSecondaryGroup && typeof timeLeft === 'number' && timeLeft > 0 && (
                        <span className="text-xs opacity-90 mt-1">⏰ {toFa(formatTimer(timeLeft))}</span>
                      )}
                    </button>
                  ) : (
                    <div className="w-full bg-gray-200 text-gray-500 py-3 px-4 rounded-xl font-semibold text-sm text-center">
                      زمان ایجاد گروه ثانویه به پایان رسید
                    </div>
                  )}

                  <button
                    onClick={() => setIsSheetOpen(false)}
                    className="w-full text-gray-500 py-2 px-4 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                  >
                    بعداً
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
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