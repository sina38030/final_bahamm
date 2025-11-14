"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Order } from "@/types/order";
import { orderApi } from "@/lib/api";

// Import PaymentDetails component from invitee page
import PaymentDetails from "../invitee/_components/PaymentDetails";

function SoloSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderIdParam = searchParams.get("orderId");
  const authorityParam = searchParams.get("authority") || searchParams.get("Authority");

  useEffect(() => {
    const loadData = async () => {
      console.log('[SoloSuccess] Loading data with params:', {
        orderIdParam,
        authorityParam,
        currentUrl: typeof window !== 'undefined' ? window.location.href : 'SSR'
      });

      // Always use authority if available, otherwise use orderId
      const lookupKey = authorityParam || orderIdParam;
      
      if (!lookupKey) {
        console.error('[SoloSuccess] No authority or orderId provided');
        setError("شناسه سفارش یافت نشد");
        setLoading(false);
        return;
      }

      console.log('[SoloSuccess] Fetching order with key:', lookupKey);

      try {
        // Fetch order data directly from backend API using authority
        const url = `/api/payment/order/${lookupKey}`;
        console.log('[SoloSuccess] Fetching from:', url);
        
        const response = await fetch(url);
        console.log('[SoloSuccess] Response status:', response.status);
        
        const data = await response.json();
        console.log('[SoloSuccess] Response data:', data);
        
        if (!data.success || !data.order) {
          throw new Error(data.error || 'Failed to fetch order');
        }
        
        // Convert backend format to frontend Order type
        const backendOrder = data.order;
        const orderData: Order = {
          id: String(backendOrder.id),
          userId: String(backendOrder.user_id || ''),
          status: backendOrder.status || 'paid',
          totalOriginal: backendOrder.total_amount || 0,
          totalPaid: backendOrder.total_amount || 0,
          paidAt: backendOrder.created_at || new Date().toISOString(),
          items: (backendOrder.items || []).map((item: any) => ({
            productId: item.product_id,
            name: item.product?.name || 'محصول',
            qty: item.quantity || 1,
            unitPrice: item.base_price || 0,
            image: item.product?.images?.[0] || null
          })),
          payment: {
            maskedCard: '',
            bankRef: backendOrder.payment_ref_id || ''
          }
        };

        console.log('[SoloSuccess] Order data processed successfully:', orderData);
        setOrder(orderData);
      } catch (err) {
        console.error("[SoloSuccess] Failed to load order:", err);
        const errorMsg = err instanceof Error ? err.message : "خطا در بارگذاری اطلاعات";
        setError(errorMsg);
      } finally {
        console.log('[SoloSuccess] Loading complete, setting loading to false');
        setLoading(false);
      }
    };

    loadData();
  }, [orderIdParam, authorityParam]);

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
          <h1 className="text-lg font-extrabold text-gray-900 mb-1">پرداخت موفق</h1>
          <p className="text-gray-600 text-sm">سفارش شما با موفقیت ثبت شد</p>
        </div>

        {/* Content */}
        <div className="px-4 space-y-6">
          {/* Payment Details */}
          <PaymentDetails order={order} />

          {/* CTA - Only Order Details Button */}
          <div className="flex justify-center">
            <Link 
              href={`/order/${order.id}`} 
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors w-full max-w-xs"
            >
              مشاهده جزئیات سفارش
            </Link>
          </div>

          {/* Optional: Add a message about the order */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-blue-800 text-sm">
              سفارش شما با موفقیت ثبت شد و به زودی برای شما ارسال خواهد شد
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SoloSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">در حال بارگذاری…</p>
      </div>
    }>
      <SoloSuccessContent />
    </Suspense>
  );
}

