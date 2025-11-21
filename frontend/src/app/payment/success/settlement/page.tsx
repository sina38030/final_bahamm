"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Order } from "@/types/order";

function SettlementSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderIdParam = searchParams.get("orderId");
  const groupIdParam = searchParams.get("groupId");
  const authorityParam = searchParams.get("authority") || searchParams.get("Authority");

  useEffect(() => {
    const loadData = async () => {
      console.log('[SettlementSuccess] Loading data with params:', {
        orderIdParam,
        groupIdParam,
        authorityParam,
      });

      let resolvedOrderId = orderIdParam || "";
      let resolvedGroupId = groupIdParam || "";

      // Resolve by authority if orderId is missing
      if (!resolvedOrderId && authorityParam) {
        console.log('[SettlementSuccess] Resolving orderId by authority:', authorityParam);
        try {
          const res = await fetch(`/api/payment/order/${authorityParam}`);
          const j = await res.json();
          if (j?.success && j.order?.id) {
            resolvedOrderId = String(j.order.id);
            resolvedGroupId = String(j.order.group_order_id || j.order.groupId || "");
            console.log('[SettlementSuccess] Resolved:', { resolvedOrderId, resolvedGroupId });
          }
        } catch (err) {
          console.error('[SettlementSuccess] Failed to resolve by authority:', err);
        }
      }

      if (!resolvedOrderId) {
        console.error('[SettlementSuccess] No orderId found, showing error');
        setError("شناسه سفارش یافت نشد");
        setLoading(false);
        return;
      }

      try {
        // Load order data
        const response = await fetch(`/api/orders/${resolvedOrderId}`);
        if (!response.ok) {
          throw new Error("خطا در بارگذاری اطلاعات سفارش");
        }
        
        const orderData = await response.json();
        
        // Validate order status
        const isPaid =
          (orderData.status && orderData.status.toLowerCase() === "paid") ||
          !!orderData.paidAt ||
          !!orderData.payment?.bankRef;
        
        if (!isPaid) {
          console.warn("Order not marked as paid; continuing for UX.");
        }

        setOrder(orderData);
        
        // Mark that settlement was completed for this group to trigger refresh on groups page
        if (resolvedGroupId) {
          try {
            localStorage.setItem(`settlement-completed-${resolvedGroupId}`, Date.now().toString());
            console.log('[SettlementSuccess] Marked settlement as completed for group', resolvedGroupId);
            
            // Dispatch custom event for same-tab refresh
            window.dispatchEvent(new CustomEvent('settlement-completed', { 
              detail: { groupId: resolvedGroupId } 
            }));
          } catch (e) {
            console.warn('Failed to set settlement completion flag:', e);
          }
        }
      } catch (err) {
        console.error("Failed to load order data:", err);
        const errorMsg = err instanceof Error ? err.message : "خطا در بارگذاری اطلاعات";
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orderIdParam, groupIdParam, authorityParam]);

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

  if (!order) {
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
          <h1 className="text-lg font-extrabold text-gray-900 mb-1">پرداخت تسویه موفق</h1>
          <p className="text-gray-600 text-sm">تسویه گروه شما با موفقیت انجام شد</p>
        </div>

        {/* Content */}
        <div className="px-4 space-y-6">
          {/* Payment Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">مبلغ پرداختی</span>
                <span className="font-bold text-gray-900">
                  {((order as any).total_amount)?.toLocaleString('fa-IR') || '۰'} تومان
                </span>
              </div>
              
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">شماره سفارش</span>
                <span className="font-medium text-gray-700">#{order.id}</span>
              </div>
              
              {groupIdParam && (
                <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                  <span className="text-sm text-gray-600">شماره گروه</span>
                  <span className="font-medium text-gray-700">#{groupIdParam}</span>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">وضعیت</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  پرداخت شده
                </span>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  تسویه حساب کامل شد
                </h3>
                <p className="text-xs text-blue-700">
                  تسویه گروه شما با موفقیت انجام شد. می‌توانید جزئیات گروه خود را در صفحه گروه‌ها مشاهده کنید.
                </p>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-3">
            <Link 
              href="/groups-orders" 
              className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              مشاهده گروه‌ها
            </Link>
            <Link 
              href="/" 
              className="inline-flex items-center justify-center px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              صفحه اصلی
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettlementSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-600">در حال بارگذاری…</p></div>}>
      <SettlementSuccessContent />
    </Suspense>
  );
}

