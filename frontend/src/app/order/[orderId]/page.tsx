"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaArrowRight } from "react-icons/fa";

type TimelineStage = "PENDING" | "PROCESSING" | "SHIPPED" | "COMPLETED";

type OrderItem = {
  productId: number | string;
  name: string;
  qty: number;
  unitPrice: number;
  image?: string | null;
};

type PublicOrder = {
  id: number;
  status: string;
  totalOriginal: number;
  totalPaid: number;
  paidAt?: string | null;
  items: OrderItem[];
  payment?: { maskedCard?: string; bankRef?: string };
  // Optional fields if backend extends later
  address?: string | null;
  delivery_slot?: string | null;
  shipping_details?: any;
};

function toFaStatusLabel(raw?: string | null): string {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return "نامشخص";
  if (raw && /ارسال|تحویل|مرجوع|لغو|تکمیل|آماده|انتظار/.test(String(raw))) {
    return String(raw);
  }
  if (/pending|await|awaiting/.test(s)) return "در انتظار";
  if (/prepare|processing|in_progress|pack/.test(s)) return "در حال پردازش";
  if (/sent|ship|shipped|dispatch|dispatched|in_transit|out_for_delivery/.test(s)) return "ارسال شده";
  if (/deliver|delivered|delivering/.test(s)) return "تحویل داده شده";
  if (/return|returned|refund|refunded/.test(s)) return "مرجوع شده";
  if (/cancel|canceled|cancelled|void/.test(s)) return "لغو شده";
  if (/complete|completed|done|fulfilled|success/.test(s)) return "تکمیل شده";
  return String(raw || "نامشخص");
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function toFaDigits(input: string): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[parseInt(d)]);
}

function sanitizeAddressString(raw?: string | null): string {
  if (!raw) return "";
  try {
    let s = String(raw).trim();
    s = s.replace(/^PENDING_(GROUP|INVITE):[^|]*\|?/, "").trim();
    if (!s) return "";
    if (s.startsWith("{") || s.startsWith("[")) {
      try {
        const obj = JSON.parse(s);
        if (obj && typeof obj === "object") {
          const full = String((obj.full_address ?? obj.address ?? "")).trim();
          const details = String((obj.details ?? obj.receiver_name ?? "")).trim();
          const postal = String((obj.postal_code ?? obj.postalCode ?? "")).trim();
          const parts: string[] = [];
          if (full) parts.push(full);
          if (details) parts.push(details);
          if (postal) parts.push(`کدپستی: ${postal}`);
          const combined = parts.join("، ");
          if (combined) return toFaDigits(combined);
        }
      } catch {}
    }
    s = s.replace(/\b(province|city|district|street|alley|no|unit|postal_code|recipient_name|phone)\s*:\s*/gi, "");
    return toFaDigits(s);
  } catch {
    return String(raw);
  }
}

function mapStatusToStages(status: string | undefined): TimelineStage[] {
  const s = (status || "").toLowerCase();
  // Heuristic mapping based on common statuses
  if (s.includes("completed") || s.includes("تکمیل")) {
    return ["PENDING", "PROCESSING", "SHIPPED", "COMPLETED"];
  }
  if (s.includes("shipped") || s.includes("ارسال")) {
    return ["PENDING", "PROCESSING", "SHIPPED"];
  }
  if (s.includes("processing") || s.includes("آماده") || s.includes("در حال")) {
    return ["PENDING", "PROCESSING"];
  }
  return ["PENDING"]; // default minimal
}

export default function OrderTrackingPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId;
  const router = useRouter();
  const [data, setData] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!orderId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok || !j?.success) {
          setError(j?.error || "خطا در دریافت اطلاعات سفارش");
          setData(null);
        } else {
          // API returns { success, order }
          const order = j.order as any;
          // Normalize to PublicOrder shape
          const normalized: PublicOrder = {
            id: Number(order?.id ?? order?.order_id ?? orderId),
            status: String(order?.status || ""),
            totalOriginal: Number(order?.totalOriginal ?? order?.total_amount ?? 0),
            totalPaid: Number(order?.totalPaid ?? order?.total_amount ?? 0),
            paidAt: order?.paidAt ?? order?.paid_at ?? null,
            items: Array.isArray(order?.items)
              ? order.items.map((it: any) => ({
                  productId: it.productId ?? it.product_id,
                  name: it.name ?? it.product?.name ?? `محصول ${it.product_id}`,
                  qty: it.qty ?? it.quantity ?? 1,
                  unitPrice: it.unitPrice ?? it.base_price ?? 0,
                  image: it.image ?? (it.product?.images?.[0] ?? null),
                }))
              : [],
            payment: order?.payment || { maskedCard: "****-****-****-****", bankRef: order?.payment_ref_id },
            address: order?.shipping_address ?? null,
            delivery_slot: order?.delivery_slot ?? null,
            shipping_details: order?.shipping_details ?? null,
          };
          // If address/time are missing, try authenticated backend admin endpoint from client
          const needsDetails = !normalized.address && !normalized.shipping_details && !normalized.delivery_slot;
          if (needsDetails) {
            try {
              const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
              const backendUrl = typeof window !== 'undefined' ? window.location.origin.replace(/\/$/, '') : '';
              const adminRes = await fetch(`${backendUrl}/api/admin/orders/${encodeURIComponent(String(normalized.id))}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                cache: 'no-store',
              });
              if (adminRes.ok) {
                const det = await adminRes.json().catch(() => ({} as any));
                normalized.address = det?.shipping_address ?? normalized.address;
                normalized.delivery_slot = det?.delivery_slot ?? normalized.delivery_slot;
                normalized.shipping_details = det?.shipping_details ?? normalized.shipping_details;
              }
            } catch {}
          }
          setData(normalized);
        }
      } catch (e) {
        if (!alive) return;
        setError("خطا در اتصال به سرور");
        setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [orderId]);

  const stages = useMemo(() => mapStatusToStages(data?.status), [data?.status]);

  const deliveryInfo = useMemo(() => {
    const raw = data?.delivery_slot;
    if (!raw) return null as null | { text: string };
    try {
      const s = String(raw);
      if (s.startsWith("{") || s.startsWith("[")) {
        const obj = JSON.parse(s);
        const v = obj.delivery_slot || obj.slot || obj.time_slot || obj.time;
        return { text: v ? String(v) : s };
      }
      return { text: s };
    } catch {
      return { text: String(raw) };
    }
  }, [data?.delivery_slot]);

  const deliveryParts = useMemo(() => {
    const t = deliveryInfo?.text || "";
    if (!t) return { date: "", time: "" };
    // Try to extract yyyy-mm-dd and time range hh:mm-hh:mm
    const dateMatch = t.match(/\b\d{4}-\d{2}-\d{2}\b/);
    const timeMatch = t.match(/\b\d{1,2}:\d{2}\s*(?:-\s*\d{1,2}:\d{2})?\b/);
    const isoMatch = t.match(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\b/);
    if (dateMatch && timeMatch) return { date: dateMatch[0], time: timeMatch[0].replace(/\s+/g, "") };
    if (isoMatch) {
      const [d, tm] = isoMatch[0].split("T");
      return { date: d, time: tm };
    }
    // Fallback: if contains only time, show it; else put all in date
    if (timeMatch) return { date: "", time: timeMatch[0].replace(/\s+/g, "") };
    return { date: t, time: "" };
  }, [deliveryInfo?.text]);

  const addressText = useMemo(() => {
    if (data?.shipping_details && typeof data.shipping_details === "object") {
      const d = data.shipping_details as any;
      const parts = [
        d.province,
        d.city,
        d.district,
        d.street,
        d.alley,
        d.no,
        d.unit,
        d.postal_code ? `کد پستی: ${d.postal_code}` : undefined,
        d.recipient_name ? `گیرنده: ${d.recipient_name}` : undefined,
        d.phone ? `تلفن: ${d.phone}` : undefined,
      ].filter(Boolean);
      if (parts.length > 0) return toFaDigits(parts.join("، "));
    }
    return sanitizeAddressString(data?.address);
  }, [data?.shipping_details, data?.address]);

  // Compute summary from items and paid amount (must be before any early returns)
  const originalPrice = useMemo(() => {
    try {
      return (data?.items || []).reduce(
        (sum, it) => sum + Number(it.unitPrice || 0) * Number(it.qty || 0),
        0
      );
    } catch {
      return Number(data?.totalOriginal || 0);
    }
  }, [data?.items, data?.totalOriginal]);
  const amountPaid = Number(data?.totalPaid || 0);
  const groupDiscount = Math.max(0, originalPrice - amountPaid);
  const finalItemsPrice = Math.max(0, originalPrice - groupDiscount);
  const shippingCost = 0;
  const rewardCredit = 0; // اگر از بک‌اند آمد، این مقدار را جایگزین کنید
  const grandTotal = finalItemsPrice + shippingCost - rewardCredit;

  if (!orderId) {
    return <div dir="rtl" className="p-4">شناسه سفارش نامعتبر است</div>;
  }

  if (loading) {
    return <div dir="rtl" className="p-4">در حال بارگذاری اطلاعات سفارش...</div>;
  }

  if (error) {
    return <div dir="rtl" className="p-4 text-red-600">{error}</div>;
  }

  if (!data) {
    return <div dir="rtl" className="p-4">اطلاعاتی برای این سفارش یافت نشد</div>;
  }


  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-4 pb-20 space-y-4">
      {/* Header */}
      <div className="sticky top-0 bg-white z-50 -mx-4 px-4 py-2 mb-2">
        <div className="relative flex items-center justify-between">
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold">جزئیات سفارش</h1>
          <button onClick={() => router.back()} className="ml-auto p-2 hover:bg-gray-100 rounded-full" aria-label="بازگشت">
            <FaArrowRight size={15} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-base font-bold">وضعیت سفارش</div>
          <div className="text-sm text-gray-600">کد سفارش: {data.id}</div>
        </div>
        <div className="text-sm">{toFaStatusLabel(data.status)}</div>
      </div>

      {/* Delivery time first */}
      <div className="bg-white rounded-xl shadow p-4 space-y-1">
        <div className="text-base font-bold">ساعت و تاریخ تحویل</div>
        <div className="text-sm text-gray-700">
          {deliveryParts.date ? `تاریخ: ${deliveryParts.date}` : ""}
          {deliveryParts.date && deliveryParts.time ? "، " : ""}
          {deliveryParts.time ? `ساعت: ${deliveryParts.time}` : (!deliveryParts.date ? (deliveryInfo?.text || "—") : "")}
        </div>
      </div>

      {/* Address next */}
      <div className="bg-white rounded-xl shadow p-4 space-y-1">
        <div className="text-base font-bold">آدرس محل تحویل</div>
        <div className="text-sm text-gray-700 whitespace-pre-wrap">
          {addressText || "—"}
        </div>
      </div>

      {/* Tracking steps */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="text-base font-bold mb-3">رهگیری مراحل</div>
        <ol className="relative border-r-2 border-gray-200 pr-4">
          {(["PENDING", "PROCESSING", "SHIPPED", "COMPLETED"] as TimelineStage[]).map((step, idx) => {
            const done = stages.includes(step);
            const label = step === "PENDING" ? "در انتظار"
              : step === "PROCESSING" ? "در حال پردازش"
              : step === "SHIPPED" ? "ارسال شده"
              : "تکمیل شده";
            return (
              <li key={step} className="mb-6 ml-4">
                <div className={`absolute w-3 h-3 rounded-full -right-1.5 border ${done ? 'bg-rose-500 border-rose-500' : 'bg-white border-gray-300'}`} />
                <h3 className={`text-sm font-medium leading-tight ${done ? 'text-rose-600' : 'text-gray-600'}`}>{label}</h3>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Checkout-like order summary at the end */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="text-base font-bold mb-3">خلاصه سفارش</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">قیمت اصلی کالاها</span>
            <span>{originalPrice.toLocaleString('fa-IR')} تومان</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">تخفیف خرید گروهی</span>
            <span className="text-red-600">{groupDiscount > 0 ? '-' : ''}{groupDiscount.toLocaleString('fa-IR')} تومان</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">قیمت نهایی کالا(ها)</span>
            <span>{finalItemsPrice.toLocaleString('fa-IR')} تومان</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">هزینه ارسال</span>
            <span className={shippingCost === 0 ? 'text-green-600' : ''}>{shippingCost === 0 ? 'رایگان' : `${Number(shippingCost || 0).toLocaleString('fa-IR')} تومان`}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">جایزه تجمیع سفارشات</span>
            <span className="text-red-600">{rewardCredit > 0 ? '-' : ''}{Math.abs(rewardCredit).toLocaleString('fa-IR')} تومان</span>
          </div>
          <div className="flex justify-between border-t pt-2 font-medium">
            <span>جمع کل</span>
            <span>{grandTotal.toLocaleString('fa-IR')} تومان</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">مبلغ پرداخت شده</span>
            <span>{amountPaid.toLocaleString('fa-IR')} تومان</span>
          </div>
        </div>
      </div>

      
    </div>
  );
}


