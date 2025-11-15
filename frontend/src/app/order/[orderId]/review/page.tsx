"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaArrowRight, FaStar } from "react-icons/fa";
import apiClient from "@/utils/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { isReviewEligibleStatus } from "@/utils/orderStatus";

type OrderProductItem = {
  productId: number | string;
  name: string;
  qty: number;
  image?: string | null;
};

type OrderForReview = {
  id: number;
  status: string;
  items: OrderProductItem[];
};

const RATING_VALUES = [1, 2, 3, 4, 5];

function toFaStatusLabel(raw?: string | null): string {
  if (!raw) return "نامشخص";
  if (/ارسال|تحویل|تکمیل|لغو|مرجوع/.test(raw)) return raw;
  const lowered = raw.toLowerCase();
  if (/pending|await|awaiting/.test(lowered)) return "در انتظار";
  if (/processing|prepare|in_progress/.test(lowered)) return "در حال آماده‌سازی";
  if (/ship|sent|dispatch|in_transit/.test(lowered)) return "ارسال شده";
  if (/deliver|delivered|complete|completed|success|fulfilled/.test(lowered)) return "تحویل داده شده";
  if (/cancel|canceled|cancelled|void/.test(lowered)) return "لغو شده";
  return raw || "نامشخص";
}

function normalizeOrderForReview(order: any, fallbackId: string | number): OrderForReview {
  const candidateArrays = [
    order?.items,
    order?.order_items,
    order?.OrderItems,
    order?.order?.items,
    order?.data?.items,
  ];

  const sourceItems = (candidateArrays.find((arr) => Array.isArray(arr)) ?? []) as any[];

  const normalizedItems: OrderProductItem[] = sourceItems.map((item, idx) => ({
    productId: item?.product_id ?? item?.productId ?? item?.id ?? idx,
    name: item?.product_name ?? item?.name ?? item?.product?.name ?? `محصول ${idx + 1}`,
    qty: Number(item?.quantity ?? item?.qty ?? item?.amount ?? 1),
    image: item?.image ?? item?.product?.images?.[0] ?? null,
  }));

  return {
    id: Number(order?.id ?? order?.order_id ?? fallbackId),
    status: String(order?.status ?? ""),
    items: normalizedItems.filter((it) => it.productId !== undefined && it.productId !== null),
  };
}

export default function OrderReviewPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId;
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [order, setOrder] = useState<OrderForReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | number | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let alive = true;

    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.success) {
          throw new Error(payload?.error || "خطا در دریافت اطلاعات سفارش");
        }
        const normalized = normalizeOrderForReview(payload.order, orderId);
        if (!alive) return;
        setOrder(normalized);
        if (normalized.items.length > 0) {
          setSelectedProductId(normalized.items[0].productId);
        }
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || "خطا در اتصال به سرور");
        setOrder(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    fetchOrder();
    return () => {
      alive = false;
    };
  }, [orderId]);

  const selectedProduct = useMemo(
    () => order?.items.find((item) => String(item.productId) === String(selectedProductId)),
    [order?.items, selectedProductId]
  );

  const canSubmit = Boolean(
    order &&
      selectedProduct &&
      rating >= 1 &&
      rating <= 5 &&
      isReviewEligibleStatus(order.status) &&
      isAuthenticated
  );

  const handleSubmit = async () => {
    if (!order || !selectedProduct || !canSubmit || submitting || !user?.id) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      const displayName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim() || undefined;
      const res = await apiClient.post(`/product/${selectedProduct.productId}/reviews`, {
        rating,
        comment: comment.trim() || null,
        user_id: user.id,
        display_name: displayName,
      });

      if (!res.ok) {
        let detail = "ثبت نظر با خطا مواجه شد";
        try {
          const data = await res.json();
          detail = data?.detail || data?.error || detail;
        } catch {}
        throw new Error(detail);
      }

      setSuccessMessage("نظر شما با موفقیت ثبت شد. از همراهی شما متشکریم!");
      setComment("");
      setRating(0);
    } catch (err: any) {
      setSubmitError(err?.message || "امکان ثبت نظر وجود ندارد");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginRedirect = () => {
    router.push("/auth/login");
  };

  const handleBackToOrders = () => {
    router.push("/groups-orders?tab=orders");
  };

  if (!orderId) {
    return <div dir="rtl" className="p-4 text-sm">شناسه سفارش نامعتبر است.</div>;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 p-4 pb-24 space-y-4">
      <div className="sticky top-0 bg-white z-50 -mx-4 px-4 py-3 shadow-sm flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-gray-100 transition"
          aria-label="بازگشت"
        >
          <FaArrowRight size={14} />
        </button>
        <h1 className="text-sm font-bold">ثبت نظر برای سفارش</h1>
        <div className="w-6" />
      </div>

      {loading && <div className="text-sm text-gray-600">در حال بارگذاری اطلاعات سفارش...</div>}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</div>
      )}

      {!loading && !error && !order && (
        <div className="text-sm text-gray-600 bg-white rounded-xl shadow p-4">سفارشی یافت نشد.</div>
      )}

      {!loading && order && (
        <>
          <div className="bg-white rounded-xl shadow p-4 space-y-1">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>کد سفارش: {order.id}</span>
              <span className="font-medium text-rose-600">{toFaStatusLabel(order.status)}</span>
            </div>
            {!isReviewEligibleStatus(order.status) && (
              <div className="text-xs text-gray-500">
                این سفارش هنوز در وضعیت تحویل‌ داده شده/تکمیل شده نیست. پس از تحویل می‌توانید نظر بدهید.
              </div>
            )}
          </div>

          {!isAuthenticated && (
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <div className="text-sm text-gray-700">برای ثبت نظر ابتدا باید وارد حساب کاربری خود شوید.</div>
              <button
                onClick={handleLoginRedirect}
                className="w-full py-2 rounded-lg bg-rose-500 text-white text-sm font-bold"
              >
                ورود به حساب کاربری
              </button>
            </div>
          )}

          {isAuthenticated && isReviewEligibleStatus(order.status) && (
            <>
              <div className="bg-white rounded-xl shadow p-4 space-y-3">
                <div className="text-base font-bold">محصولات داخل این سفارش</div>
                {order.items.length === 0 ? (
                  <div className="text-sm text-gray-500">برای این سفارش محصولی ثبت نشده است.</div>
                ) : (
                  <div className="space-y-2">
                    {order.items.map((item) => {
                      const isSelected = String(item.productId) === String(selectedProductId);
                      return (
                        <button
                          key={`${item.productId}`}
                          type="button"
                          className={`w-full border rounded-lg p-3 text-right transition ${
                            isSelected ? "border-rose-500 bg-rose-50" : "border-gray-200 bg-gray-50"
                          }`}
                          onClick={() => setSelectedProductId(item.productId)}
                        >
                          <div className="flex items-center gap-3">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-12 h-12 rounded-lg object-cover border border-gray-100"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                                بدون تصویر
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-800">{item.name}</div>
                              <div className="text-xs text-gray-500">تعداد: {item.qty}</div>
                            </div>
                            {isSelected && (
                              <span className="text-xs text-rose-600 font-semibold">انتخاب شده</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {order.items.length > 0 && (
                <div className="bg-white rounded-xl shadow p-4 space-y-4">
                  <div>
                    <div className="text-base font-bold mb-2">امتیاز شما</div>
                    <div className="flex items-center justify-between gap-2">
                      {RATING_VALUES.map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`flex flex-col items-center flex-1 py-2 rounded-lg border transition ${
                            rating >= value ? "border-yellow-400 bg-yellow-50" : "border-gray-200 bg-gray-50"
                          }`}
                          onClick={() => setRating(value)}
                        >
                          <FaStar className={rating >= value ? "text-yellow-400" : "text-gray-300"} size={18} />
                          <span className="text-xs text-gray-600 mt-1">{value}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="review-comment" className="text-base font-bold">
                        نظر شما
                      </label>
                      <span className="text-xs text-gray-400">اختیاری</span>
                    </div>
                    <textarea
                      id="review-comment"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-rose-500 focus:ring focus:ring-rose-100 transition"
                      placeholder="تجربه خود از دریافت این سفارش را برای ما بنویسید..."
                    />
                  </div>

                  {submitError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                      {submitError}
                    </div>
                  )}

                  {successMessage && (
                    <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                      {successMessage}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={!canSubmit || submitting}
                    onClick={handleSubmit}
                    className={`w-full py-3 rounded-xl text-sm font-bold text-white transition ${
                      canSubmit && !submitting
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {submitting ? "در حال ثبت..." : "ثبت امتیاز و نظر"}
                  </button>
                </div>
              )}
            </>
          )}

          <button
            onClick={handleBackToOrders}
            className="w-full py-3 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 bg-white shadow-sm"
          >
            بازگشت به سفارش‌ها
          </button>
        </>
      )}
    </div>
  );
}


