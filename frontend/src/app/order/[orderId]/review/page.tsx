"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaArrowRight, FaStar, FaEdit } from "react-icons/fa";
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

type ExistingReview = {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
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
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);

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

  // Fetch existing review when user is authenticated and product is selected
  useEffect(() => {
    if (!selectedProductId || !user?.id || !isAuthenticated) {
      setExistingReview(null);
      return;
    }

    let alive = true;

    const fetchExistingReview = async () => {
      setLoadingReview(true);
      try {
        const res = await apiClient.get(`/product/${selectedProductId}/reviews`);
        if (!res.ok) {
          setExistingReview(null);
          return;
        }
        const reviews = await res.json();
        if (!alive) return;
        
        // Find review by current user
        const userReview = reviews.find((r: any) => r.user_id === user.id);
        if (userReview) {
          setExistingReview({
            id: userReview.id,
            rating: userReview.rating,
            comment: userReview.comment || null,
            created_at: userReview.created_at,
          });
          // Mark in localStorage that this order has been reviewed
          if (typeof window !== 'undefined' && orderId) {
            localStorage.setItem(`order-${orderId}-reviewed-by-${user.id}`, 'true');
          }
          // Don't set rating and comment here - only when editing
        } else {
          setExistingReview(null);
          // Remove localStorage flag if no review exists
          if (typeof window !== 'undefined' && orderId) {
            localStorage.removeItem(`order-${orderId}-reviewed-by-${user.id}`);
          }
        }
      } catch (err) {
        if (!alive) return;
        setExistingReview(null);
      } finally {
        if (alive) setLoadingReview(false);
      }
    };

    fetchExistingReview();
    return () => {
      alive = false;
    };
  }, [selectedProductId, user?.id, isAuthenticated, orderId]);

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
      
      let res;
      if (existingReview && isEditing) {
        // Update existing review
        res = await apiClient.put(`/product/${selectedProduct.productId}/reviews/${existingReview.id}`, {
          rating,
          comment: comment.trim() || null,
          display_name: displayName,
        });
      } else {
        // Create new review
        res = await apiClient.post(`/product/${selectedProduct.productId}/reviews`, {
          rating,
          comment: comment.trim() || null,
          user_id: user.id,
          display_name: displayName,
        });
      }

      if (!res.ok) {
        let detail = existingReview && isEditing ? "ویرایش نظر با خطا مواجه شد" : "ثبت نظر با خطا مواجه شد";
        try {
          const data = await res.json();
          detail = data?.detail || data?.error || detail;
        } catch {}
        throw new Error(detail);
      }

      const responseData = await res.json();
      
      // Update existing review state
      setExistingReview({
        id: responseData.id,
        rating: responseData.rating,
        comment: responseData.comment || null,
        created_at: responseData.created_at,
      });
      
      // Store in localStorage and dispatch event
      if (typeof window !== 'undefined' && orderId && user?.id) {
        localStorage.setItem(`order-${orderId}-reviewed-by-${user.id}`, 'true');
        window.dispatchEvent(new CustomEvent('order-review-submitted', { 
          detail: { orderId: Number(orderId) } 
        }));
      }
      
      setSuccessMessage(
        existingReview && isEditing 
          ? "نظر شما با موفقیت ویرایش شد. از همراهی شما متشکریم!" 
          : "نظر شما با موفقیت ثبت شد. از همراهی شما متشکریم!"
      );
      setComment("");
      setRating(0);
      setIsEditing(false);
    } catch (err: any) {
      setSubmitError(err?.message || "امکان ثبت نظر وجود ندارد");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = () => {
    if (existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || "");
      setIsEditing(true);
      setSuccessMessage(null);
      setSubmitError(null);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setRating(0);
    setComment("");
    setSubmitError(null);
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
          {!isReviewEligibleStatus(order.status) && (
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-xs text-gray-500">
                این سفارش هنوز در وضعیت تحویل‌ داده شده/تکمیل شده نیست. پس از تحویل می‌توانید نظر بدهید.
              </div>
            </div>
          )}

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
              {order.items.length > 0 && (
                <>
                  {loadingReview ? (
                    <div className="bg-white rounded-xl shadow p-4">
                      <div className="text-sm text-gray-600">در حال بررسی نظر قبلی...</div>
                    </div>
                  ) : existingReview && !isEditing ? (
                    // Show existing review with edit button
                    <div className="bg-white rounded-xl shadow p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-base font-bold">نظر شما</div>
                        <button
                          onClick={handleEdit}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition text-sm font-medium"
                        >
                          <FaEdit size={14} />
                          <span>ویرایش</span>
                        </button>
                      </div>

                      <div>
                        <div className="text-sm text-gray-600 mb-2">امتیاز شما:</div>
                        <div className="flex items-center gap-1">
                          {RATING_VALUES.map((value) => (
                            <FaStar
                              key={value}
                              className={existingReview.rating >= value ? "text-yellow-400" : "text-gray-300"}
                              size={20}
                            />
                          ))}
                          <span className="mr-2 text-sm font-semibold text-gray-700">
                            {existingReview.rating} از 5
                          </span>
                        </div>
                      </div>

                      {existingReview.comment && (
                        <div>
                          <div className="text-sm text-gray-600 mb-2">نظر شما:</div>
                          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-800 border border-gray-200">
                            {existingReview.comment}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                        ثبت شده در: {new Date(existingReview.created_at).toLocaleDateString('fa-IR')}
                      </div>
                    </div>
                  ) : (
                    // Show form for new review or editing
                    <div className="bg-white rounded-xl shadow p-4 space-y-4">
                      {isEditing && (
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                          <div className="text-base font-bold">ویرایش نظر</div>
                          <button
                            onClick={handleCancelEdit}
                            className="text-sm text-gray-600 hover:text-gray-800"
                          >
                            انصراف
                          </button>
                        </div>
                      )}

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
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="review-comment" className="text-base font-bold mb-1 block">
                          نظر شما
                        </label>
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
                        {submitting 
                          ? (isEditing ? "در حال ویرایش..." : "در حال ثبت...") 
                          : (isEditing ? "ثبت ویرایش" : "ثبت امتیاز و نظر")
                        }
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}


