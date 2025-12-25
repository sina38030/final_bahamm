"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  FaArrowRight, 
  FaBox, 
  FaTruck, 
  FaCheckCircle, 
  FaClock, 
  FaMapMarkerAlt,
  FaShoppingBag,
  FaClipboardList
} from "react-icons/fa";
import { safeStorage } from "@/utils/safeStorage";

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
  if (/pending|await|awaiting/.test(s)) return "در انتظار تایید";
  if (/prepare|processing|in_progress|pack/.test(s)) return "در حال آماده‌سازی";
  if (/sent|ship|shipped|dispatch|dispatched|in_transit|out_for_delivery/.test(s)) return "ارسال شده";
  if (/deliver|delivered|delivering/.test(s)) return "تحویل داده شده";
  if (/return|returned|refund|refunded/.test(s)) return "مرجوع شده";
  if (/cancel|canceled|cancelled|void/.test(s)) return "لغو شده";
  if (/complete|completed|done|fulfilled|success|delivered|delivery/.test(s)) return "تحویل داده شده";
  return String(raw || "نامشخص");
}

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
function toFaDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[parseInt(d)]);
}

function formatPrice(price: number): string {
  return toFaDigits(price.toLocaleString('fa-IR'));
}

const DIGIT_NORMALIZATION_MAP: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '٬': '', ',': '', '　': '', ' ': '', '٫': '.'
};

function formatDeliverySlotDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  try {
    const formatted = date
      .toLocaleDateString('fa-IR', { day: 'numeric', month: 'long' })
      .replace(/\u200f/g, '')
      .replace(/\u200e/g, '')
      .trim();
    return toFaDigits(formatted);
  } catch {
    return '';
  }
}

function normalizeTimeToken(value?: string | number | null): string {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const withLatinDigits = raw.replace(/[۰-۹٠-٩]/g, (ch) => DIGIT_NORMALIZATION_MAP[ch] ?? ch);
  const cleaned = withLatinDigits.replace(/\s+/g, ' ').replace(/ساعت\s*/gi, '').trim();
  const normalized = cleaned.replace(/\s*:\s*/g, ':');
  const explicitMatch = normalized.match(/(\d{1,2})(?::(\d{2}))?/);
  if (explicitMatch) {
    const hour = explicitMatch[1];
    const minutes = explicitMatch[2];
    if (minutes && minutes !== '00') return toFaDigits(`${hour}:${minutes}`);
    return toFaDigits(hour);
  }
  const digitsOnly = normalized.replace(/\D/g, '');
  if (!digitsOnly) return '';
  if (digitsOnly.length === 3) return toFaDigits(`${digitsOnly.slice(0, 1)}:${digitsOnly.slice(1)}`);
  if (digitsOnly.length >= 4) {
    return toFaDigits(`${digitsOnly.slice(0, digitsOnly.length - 2)}:${digitsOnly.slice(-2)}`);
  }
  return toFaDigits(digitsOnly);
}

function buildSlotDisplay(
  date: Date | null,
  from?: string | number | null,
  to?: string | number | null,
  rawDateLabel?: string | null
): string {
  const datePart =
    date && !Number.isNaN(date.getTime())
      ? formatDeliverySlotDate(date)
      : (rawDateLabel ? toFaDigits(String(rawDateLabel).trim()) : '');
  const fromPart = normalizeTimeToken(from);
  const toPart = normalizeTimeToken(to);
  const hasTime = Boolean(fromPart || toPart);
  if (datePart && hasTime) {
    const range = fromPart && toPart ? `${fromPart} تا ${toPart}` : (fromPart || toPart);
    return `${datePart} ساعت ${range}`;
  }
  if (datePart) return datePart;
  if (hasTime) {
    const range = fromPart && toPart ? `${fromPart} تا ${toPart}` : (fromPart || toPart);
    return `ساعت ${range}`;
  }
  return '';
}

function formatDeliverySlot(raw?: any): string {
  try {
    if (!raw) return '';
    let slot: any = raw;

    // If already an object, try to extract useful keys (backend may return structured delivery slot)
    if (slot && typeof slot === 'object') {
      const obj = slot as any;
      if (typeof obj.ds === 'string' && obj.ds.trim().length > 0) return formatDeliverySlot(obj.ds);
      if (typeof obj.delivery_slot === 'string' && obj.delivery_slot.trim().length > 0) return formatDeliverySlot(obj.delivery_slot);
      if (typeof obj.slot === 'string' && obj.slot.trim().length > 0) return formatDeliverySlot(obj.slot);
      if (typeof obj.time_slot === 'string' && obj.time_slot.trim().length > 0) return formatDeliverySlot(obj.time_slot);
      if (typeof obj.time === 'string' && obj.time.trim().length > 0) return formatDeliverySlot(obj.time);
      if (obj.date && (obj.from || obj.to)) {
        const d = new Date(String(obj.date));
        const formatted = buildSlotDisplay(d, obj.from, obj.to, String(obj.date));
        if (formatted) return formatted;
      }
      // Fall through: stringify if nothing else
    }

    if (typeof slot === 'string') {
      const trimmed = slot.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const obj = JSON.parse(trimmed);
          if (obj && typeof obj === 'object') {
            if (typeof (obj as any).ds === 'string' && (obj as any).ds.trim().length > 0) {
              return formatDeliverySlot((obj as any).ds);
            }
            if (typeof (obj as any).delivery_slot === 'string' && (obj as any).delivery_slot.trim().length > 0) {
              return formatDeliverySlot((obj as any).delivery_slot);
            }
            if ((obj as any).date && ((obj as any).from || (obj as any).to)) {
              const d = new Date(String((obj as any).date));
              const formatted = buildSlotDisplay(d, (obj as any).from, (obj as any).to, String((obj as any).date));
              if (formatted) return formatted;
            }
          }
        } catch {
          // ignore JSON parse errors and fall back to raw string
        }
      }
    }

    if (typeof slot !== 'string') slot = String(slot ?? '');
    const s = slot.trim();
    if (!s) return '';

    const sLatin = s.replace(/[۰-۹٠-٩]/g, (ch) => DIGIT_NORMALIZATION_MAP[ch] ?? ch);

    // Relative: "فردا ..."
    if (/^فردا(\s|$)/.test(s)) {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const times = sLatin.replace(/^فردا\s*/, '').trim();
      if (times) {
        const m = times.match(/(\d{1,2}(?::\d{2})?)(?:\s*(?:-|تا)\s*(\d{1,2}(?::\d{2})?))?/);
        if (m) {
          const formatted = buildSlotDisplay(tomorrow, m[1], m[2]);
          if (formatted) return formatted;
        }
      }
      const formatted = buildSlotDisplay(tomorrow);
      if (formatted) return formatted;
    }

    // YYYY-MM-DD HH:mm-HH:mm (or variants)
    const m = sLatin.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{1,2}(?::\d{2})?))?(?:\s*(?:-|تا)\s*(\d{1,2}(?::\d{2})?))?$/);
    if (m) {
      const d = new Date(`${m[1]}T00:00:00`);
      const formatted = buildSlotDisplay(d, m[2], m[3], m[1]);
      if (formatted) return formatted;
    }

    const parsedDate = Date.parse(s);
    if (!Number.isNaN(parsedDate)) {
      const formatted = buildSlotDisplay(new Date(parsedDate), undefined, undefined, s);
      if (formatted) return formatted;
    }

    return toFaDigits(s);
  } catch {
    return toFaDigits(String(raw ?? ''));
  }
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
          const parts: string[] = [];
          if (full) parts.push(full);
          if (details) parts.push(details);
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
  if (s.includes("completed") || s.includes("تکمیل") || s.includes("تحویل") || s.includes("delivered")) {
    return ["PENDING", "PROCESSING", "SHIPPED", "COMPLETED"];
  }
  if (s.includes("shipped") || s.includes("ارسال") || s.includes("in_transit")) {
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
        // Try frontend API route first, fallback to direct backend call
        let res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
        let payload: any = await res.json().catch(() => ({}));

        // Unwrap Next.js API response: { success: true, order: {...} }
        let order: any =
          payload?.success === true && payload?.order ? payload.order
          : payload;

        // If frontend API fails (or format unexpected), try direct backend call
        if (!res.ok || !order?.id) {
          console.log('Frontend API failed, trying backend directly');
          const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost';
          const backendUrl = isDevelopment ? 'http://localhost:8001' : window.location.origin;
          res = await fetch(`${backendUrl}/api/orders/${encodeURIComponent(orderId)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
          });

          if (!res.ok) {
            if (!alive) return;
            setError("خطا در دریافت اطلاعات سفارش");
            setData(null);
            return;
          }

          payload = await res.json().catch(() => ({}));
          order =
            payload?.success === true && payload?.order ? payload.order
            : payload;
        }

        if (!alive) return;
        console.log('Order data received:', order); // DEBUG: Log received data

        // Normalize to PublicOrder shape
        const normalized: PublicOrder = {
          id: Number(order?.id ?? order?.order_id ?? orderId),
          status: String(order?.status || ""),
          totalOriginal: Number(order?.totalOriginal ?? order?.total_amount ?? order?.total ?? 0),
          totalPaid: Number(order?.totalPaid ?? order?.total_amount ?? order?.total ?? 0),
          paidAt: order?.paidAt ?? order?.paid_at ?? null,
          items: Array.isArray(order?.items)
            ? order.items.map((it: any) => ({
                productId: it.productId ?? it.product_id ?? it.id,
                name: it.name ?? it.product_name ?? it.product?.name ?? `محصول ${it.product_id ?? it.productId ?? it.id}`,
                qty: Number(it.qty ?? it.quantity ?? it.amount ?? 1),
                unitPrice: Number(it.unitPrice ?? it.base_price ?? it.price ?? it.unit_price ?? 0),
                image: it.image ?? (it.product?.images?.[0] ?? null),
              }))
            : [],
          payment: order?.payment || { maskedCard: "****-****-****-****", bankRef: order?.payment_ref_id },
          // Backend may return either `shipping_address` (admin/details) or `address` (public)
          address: order?.shipping_address ?? order?.address ?? null,
          delivery_slot: order?.delivery_slot ?? order?.deliverySlot ?? null,
          shipping_details: order?.shipping_details ?? order?.shippingDetails ?? null,
        };

        setData(normalized);
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

  const deliverySlotText = useMemo(() => {
    return formatDeliverySlot(data?.delivery_slot);
  }, [data?.delivery_slot]);

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
        d.recipient_name ? `گیرنده: ${d.recipient_name}` : undefined,
        d.phone ? `تلفن: ${d.phone}` : undefined,
      ].filter(Boolean);
      if (parts.length > 0) return toFaDigits(parts.join("، "));
    }

    if (data?.address && typeof data.address === "object") {
      const addr = data.address as any;
      const parts = [
        addr.full_address,
        addr.details,
        addr.phone_number ? `تلفن: ${addr.phone_number}` : undefined,
        addr.postal_code && addr.postal_code !== '0000000000' ? `کد پستی: ${addr.postal_code}` : undefined,
      ].filter(Boolean);
      const cleanedParts = parts.map(part => {
        if (typeof part === 'string') {
          return part.replace(/[\uFFFD?]+/g, '').trim();
        }
        return part;
      }).filter(Boolean);
      if (cleanedParts.length > 0) return toFaDigits(cleanedParts.join("، "));
    }
    return sanitizeAddressString(data?.address);
  }, [data?.shipping_details, data?.address]);

  // Compute summary from items and paid amount
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
  const rewardCredit = 0;
  const grandTotal = finalItemsPrice + shippingCost - rewardCredit;

  if (!orderId) {
    return <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-gray-500">شناسه سفارش نامعتبر است</div>;
  }

  if (loading) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="animate-spin w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full"></div>
          <div>در حال بارگذاری جزئیات سفارش...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 max-w-sm w-full text-center">
          {error}
          <button onClick={() => router.back()} className="mt-4 text-sm font-bold underline">بازگشت</button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div dir="rtl" className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-gray-500">اطلاعاتی برای این سفارش یافت نشد</div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white z-40 px-4 py-3 shadow-sm/50 border-b border-gray-100 flex items-center justify-between">
        <button 
          onClick={() => router.back()} 
          className="p-2 -mr-2 text-gray-700 hover:bg-gray-50 rounded-full transition-colors" 
          aria-label="بازگشت"
        >
          <FaArrowRight size={18} />
        </button>
        <h1 className="text-base font-bold text-gray-800">جزئیات سفارش</h1>
        <div className="w-8"></div> {/* Spacer for centering */}
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Status Card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              data.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
              data.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700' :
              data.status === 'PROCESSING' ? 'bg-amber-100 text-amber-700' :
              data.status === 'PENDING' ? 'bg-gray-100 text-gray-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {toFaStatusLabel(data.status)}
            </div>
          </div>
          
          {/* Timeline */}
          <div className="relative flex items-center justify-between mt-6 px-2">
            {/* Connecting Line */}
            <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-100 -z-0 mx-4"></div>
            
            {(["PENDING", "PROCESSING", "SHIPPED", "COMPLETED"] as TimelineStage[]).map((step, idx) => {
              const done = stages.includes(step);
              
              // Determine icon
              let Icon = FaClipboardList;
              if (step === "PROCESSING") Icon = FaBox;
              if (step === "SHIPPED") Icon = FaTruck;
              if (step === "COMPLETED") Icon = FaCheckCircle;

              return (
                <div key={step} className="flex flex-col items-center relative z-10 gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    done 
                      ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200' 
                      : 'bg-white border-gray-200 text-gray-300'
                  }`}>
                    <Icon size={12} />
                  </div>
                  <span className={`text-[10px] font-medium transition-colors duration-300 ${
                    done ? 'text-gray-800' : 'text-gray-400'
                  }`}>
                    {step === "PENDING" ? "تایید"
                    : step === "PROCESSING" ? "پردازش"
                    : step === "SHIPPED" ? "ارسال"
                    : "تحویل"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Info */}
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
            <div className="bg-blue-50 text-blue-500 p-2.5 rounded-xl shrink-0">
              <FaClock size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">زمان تحویل</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {deliverySlotText || "تعیین نشده"}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
            <div className="bg-rose-50 text-rose-500 p-2.5 rounded-xl shrink-0">
              <FaMapMarkerAlt size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">آدرس تحویل</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {addressText || "آدرس ثبت نشده است"}
              </p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <FaShoppingBag className="text-gray-400" />
            <h3 className="text-sm font-bold text-gray-800">اقلام سفارش</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.items.map((item, idx) => (
              <div key={idx} className="p-4 flex gap-4">
                <div className="w-20 h-20 bg-gray-50 rounded-xl border border-gray-100 shrink-0 flex items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <FaBox className="text-gray-300 text-2xl" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center gap-1">
                  <h4 className="text-sm font-medium text-gray-800 line-clamp-2 leading-6">{item.name}</h4>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                      {toFaDigits(item.qty)} عدد
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {data.items.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">
                هیچ آیتمی یافت نشد
              </div>
            )}
          </div>
        </div>

        {/* Payment & Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3 mb-1">خلاصه سفارش</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center text-gray-600">
              <span>قیمت کالاها ({toFaDigits(data.items.length)})</span>
              <span>{formatPrice(originalPrice)} تومان</span>
            </div>
            
            {groupDiscount > 0 && (
              <div className="flex justify-between items-center text-rose-600">
                <span>تخفیف خرید گروهی</span>
                <span>{toFaDigits(groupDiscount.toLocaleString('fa-IR'))} - تومان</span>
              </div>
            )}
            
            <div className="flex justify-between items-center text-gray-600">
              <span>هزینه ارسال</span>
              <span className={shippingCost === 0 ? 'text-emerald-600 font-medium' : ''}>
                {shippingCost === 0 ? 'رایگان' : `${formatPrice(shippingCost)} تومان`}
              </span>
            </div>

            {rewardCredit > 0 && (
              <div className="flex justify-between items-center text-rose-600">
                <span>کسر از کیف پول</span>
                <span>{formatPrice(rewardCredit)} - تومان</span>
              </div>
            )}
            
            <div className="border-t border-dashed border-gray-200 pt-3 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-800">مبلغ پرداخت شده</span>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-bold text-gray-900">{formatPrice(amountPaid)}</span>
                  <span className="text-xs text-gray-500">تومان</span>
                </div>
              </div>
              {data.paidAt && (
                <div className="mt-2 text-xs text-gray-400 text-left" dir="ltr">
                  {new Date(data.paidAt).toLocaleDateString('fa-IR')}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
