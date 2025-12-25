'use client';

import React, { useState, useEffect } from 'react';
import { FaStar, FaEdit } from 'react-icons/fa';
import { HiOutlineChatBubbleLeftRight, HiOutlineShoppingBag } from 'react-icons/hi2';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PrevPage from '@/components/common/PrevPage';
import apiClient from '@/utils/apiClient';
import { useAuth } from '@/contexts/AuthContext';
import PhoneAuthModal from '@/components/auth/PhoneAuthModal';

type OrderItem = {
    product_id: number;
    name: string;
    quantity: number;
    image: string | null;
    base_price: number;
};

type OrderInfo = {
    id: number;
    status: string;
    total_amount: number;
    created_at: string;
    items: OrderItem[];
};

type Review = {
    id: number;
    product_id: number;
    product_name: string;
    product_image: string | null;
    rating: number;
    comment: string | null;
    created_at: string;
    approved: boolean;
    order: OrderInfo | null;
};

export default function CommentsPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showPhoneAuth, setShowPhoneAuth] = useState(false);

    const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
    const [editedRating, setEditedRating] = useState<number>(0);
    const [editedComment, setEditedComment] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    // Fetch reviews on mount
    useEffect(() => {
        if (!isAuthenticated) {
            setLoading(false);
            return;
        }
        
        fetchReviews();
        
        // Listen for review submission events
        const handleReviewSubmitted = () => {
            fetchReviews();
        };
        
        window.addEventListener('order-review-submitted', handleReviewSubmitted);
        
        return () => {
            window.removeEventListener('order-review-submitted', handleReviewSubmitted);
        };
    }, [isAuthenticated]);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await apiClient.get('/users/reviews');
            if (res.ok) {
                const data = await res.json();
                // Ensure data is an array
                if (Array.isArray(data)) {
                    setReviews(data);
                } else {
                    setReviews([]);
                }
            } else {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData?.detail || errorData?.error || 'خطا در دریافت نظرات');
            }
        } catch (err: any) {
            console.error('Error fetching reviews:', err);
            setError(err?.message || 'خطا در دریافت نظرات');
            setReviews([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (reviewId: number) => {
        if (window.confirm('آیا از حذف این نظر مطمئن هستید؟')) {
            setReviews(reviews.filter(review => review.id !== reviewId));
        }
    };

    const handleEdit = (review: Review) => {
        setEditingReviewId(review.id);
        setEditedRating(review.rating);
        setEditedComment(review.comment || '');
        setEditError(null);
    };

    const handleCancelEdit = () => {
        setEditingReviewId(null);
        setEditedRating(0);
        setEditedComment('');
        setEditError(null);
    };

    const handleSaveEdit = async (review: Review) => {
        if (!review) return;

        setSavingEdit(true);
        setEditError(null);

        try {
            const res = await apiClient.put(`/product/${review.product_id}/reviews/${review.id}`, {
                rating: editedRating,
                comment: editedComment.trim() || null,
                display_name: null, // Keep existing display name
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData?.detail || errorData?.error || 'خطا در ویرایش نظر');
            }

            // Refresh reviews to get updated approval status
            await fetchReviews();

            setEditingReviewId(null);
            setEditedRating(0);
            setEditedComment('');
        } catch (err: any) {
            setEditError(err?.message || 'خطا در ویرایش نظر');
        } finally {
            setSavingEdit(false);
        }
    };


    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in-up">
            <div className="w-40 h-40 bg-gray-50 rounded-full flex items-center justify-center mb-6 relative">
                 <div className="absolute inset-0 bg-[#E31C5F]/5 rounded-full animate-pulse"></div>
                 <HiOutlineChatBubbleLeftRight size={64} className="text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">
                هنوز نظری ثبت نکرده‌اید
            </h3>
            <p className="text-gray-500 text-center max-w-xs text-sm leading-relaxed">
                نظرات شما به بهبود تجربه خرید سایر کاربران کمک می‌کند. اولین نظر خود را ثبت کنید!
            </p>
        </div>
    );

    const StarRating = ({ rating }: { rating: number }) => (
        <div className="flex gap-1">
            {[...Array(5)].map((_, index) => (
                <FaStar
                    key={index}
                    className={index < rating ? 'text-yellow-400' : 'text-gray-300'}
                    size={16}
                />
            ))}
        </div>
    );

    const ReviewCard = ({ review }: { review: Review }) => {
        // Safety check - return null if review is invalid
        if (!review) return null;

        const formatDate = (dateStr: string) => {
            try {
                return new Date(dateStr).toLocaleDateString('fa-IR');
            } catch {
                return dateStr;
            }
        };

        const isValidImage = (src: string | null | undefined): src is string => {
            try {
                if (typeof src !== 'string' || !src.trim()) {
                    return false;
                }
                // Check if it's a valid URL or relative path
                const trimmedSrc = src.trim();
                // Allow relative paths starting with /
                if (trimmedSrc.startsWith('/')) {
                    return true;
                }
                // Check for valid URL format
                try {
                    new URL(trimmedSrc);
                    return true;
                } catch {
                    return false;
                }
            } catch {
                return false;
            }
        };

        const isEditing = editingReviewId === review.id;

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4 transition-all hover:shadow-md">
                {/* Review Header with Product Info */}
                <div className="flex items-start gap-4 mb-5">
                    {/* تصویر محصول */}
                    <div className="w-20 h-20 relative rounded-xl overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-100 shadow-sm">
                        {(() => {
                            try {
                                const imageSrc = review.product_image;
                                if (isValidImage(imageSrc)) {
                                    return (
                                        <Image
                                            src={imageSrc}
                                            alt={review.product_name || 'محصول'}
                                            fill
                                            className="object-cover"
                                            sizes="80px"
                                            unoptimized
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                            }}
                                        />
                                    );
                                }
                            } catch (error) {
                                console.warn('Error rendering product image:', error);
                            }
                            return (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <FaStar size={24} />
                                </div>
                            );
                        })()}
                    </div>

                    {/* اطلاعات نظر */}
                    <div className="flex-grow min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                                <h3 className="font-bold text-gray-800 mb-2 truncate text-sm sm:text-base">
                                    {review.product_name}
                                </h3>
                                {isEditing ? (
                                    <div className="flex items-center gap-2">
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                className={`flex flex-col items-center flex-1 py-1 rounded-lg border transition ${
                                                    editedRating >= value ? "border-yellow-400 bg-yellow-50" : "border-gray-200 bg-gray-50"
                                                }`}
                                                onClick={() => setEditedRating(value)}
                                            >
                                                <FaStar className={editedRating >= value ? "text-yellow-400" : "text-gray-300"} size={14} />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <StarRating rating={review.rating} />
                                )}
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => handleSaveEdit(review)}
                                            disabled={savingEdit || editedRating < 1}
                                            className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 disabled:bg-gray-400 transition"
                                        >
                                            {savingEdit ? 'در حال ذخیره...' : 'ذخیره'}
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="px-3 py-1.5 bg-gray-500 text-white text-xs font-medium rounded-lg hover:bg-gray-600 transition"
                                        >
                                            انصراف
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleEdit(review)}
                                        className="p-2 text-gray-400 hover:text-[#E31C5F] hover:bg-[#E31C5F]/5 rounded-xl transition-all"
                                        title="ویرایش نظر"
                                    >
                                        <FaEdit size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {isEditing ? (
                            <div className="space-y-3">
                                <textarea
                                    value={editedComment}
                                    onChange={(e) => setEditedComment(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-rose-500 focus:ring focus:ring-rose-100 transition"
                                    placeholder="نظر خود را ویرایش کنید..."
                                />
                                <div className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2">
                                    توجه: پس از ویرایش نظر، نیاز به تایید مجدد توسط مدیر دارد.
                                </div>
                                {editError && (
                                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">
                                        {editError}
                                    </div>
                                )}
                            </div>
                        ) : (
                            review.comment && (
                                <div className="bg-gray-50 rounded-xl p-3 mt-3 text-sm text-gray-600 leading-relaxed">
                                    {review.comment}
                                </div>
                            )
                        )}

                        <div className="flex items-center gap-3 mt-3">
                            <span className="text-gray-400 text-xs font-medium bg-gray-50 px-2 py-1 rounded-lg">
                                {formatDate(review.created_at)}
                            </span>
                            {review.approved === false && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-medium border border-amber-100">
                                    در انتظار تایید
                                </span>
                            )}
                            {review.approved === true && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium border border-emerald-100">
                                    تایید شده
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Order Items Basket */}
                {review.order && Array.isArray(review.order.items) && review.order.items.length > 0 && (
                    <div className="border-t border-dashed border-gray-100 pt-4 mt-2">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-gray-50 p-1.5 rounded-lg text-gray-500">
                                <HiOutlineShoppingBag size={14} />
                            </div>
                            <span className="text-xs font-bold text-gray-700">
                                اقلام همراه سفارش
                            </span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                            {review.order.items.filter(item => item && item.name).map((item, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-2 min-w-[72px]">
                                    <div className="w-14 h-14 relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                                        {(() => {
                                            try {
                                                const imageSrc = item.image;
                                                if (isValidImage(imageSrc)) {
                                                    return (
                                                        <Image
                                                            src={imageSrc}
                                                            alt={item.name || 'محصول'}
                                                            fill
                                                            className="object-cover"
                                                            sizes="56px"
                                                            unoptimized
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                            }}
                                        />
                                    );
                                }
                                            } catch (error) {
                                                console.warn('Error rendering order item image:', error);
                                            }
                                            return (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                                                    ?
                                                </div>
                                            );
                                        })()}
                                        <div className="absolute bottom-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-tl-lg font-medium backdrop-blur-[2px]">
                                            x{item.quantity}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // If not authenticated, show login screen
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50" dir="rtl">
                <div className="sticky top-0 bg-white z-10">
                    <div className="px-4 py-3 border-b">
                        <div className="relative flex items-center justify-between">
                            <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold">نظرات من</h1>
                            <button onClick={() => router.back()} className="ml-auto p-2 hover:bg-gray-100 rounded-full" aria-label="بازگشت">
                                <span className="inline-block">❮</span>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] text-center">
                    {/* Review Icon with Animation */}
                    <div className="mb-8 relative animate-fade-in-up">
                        <div className="w-40 h-40 bg-amber-50 rounded-full flex items-center justify-center shadow-sm relative z-10">
                            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-inner">
                                <svg className="w-16 h-16 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            </div>
                        </div>
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 w-8 h-8 bg-amber-200 rounded-full opacity-50 animate-pulse delay-75"></div>
                        <div className="absolute bottom-2 left-2 w-6 h-6 bg-amber-300 rounded-full opacity-50 animate-pulse delay-150"></div>
                    </div>

                    {/* Text Content */}
                    <div className="space-y-3 mb-10 max-w-xs mx-auto animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <h2 className="text-2xl font-bold text-gray-800">
                            نظرات من
                        </h2>
                        <p className="text-base text-gray-500 leading-relaxed">
                            برای مشاهده نظرات ثبت شده، لطفاً وارد حساب کاربری شوید.
                        </p>
                    </div>

                    {/* Login Button */}
                    <div className="w-full max-w-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        <button
                            onClick={() => setShowPhoneAuth(true)}
                            className="w-full bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-amber-200 transform transition-all duration-200 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group"
                        >
                            <span>ورود به حساب کاربری</span>
                            <span className="group-hover:translate-x-[-4px] transition-transform duration-200">←</span>
                        </button>
                    </div>
                </div>

                {/* Phone Auth Modal */}
                <PhoneAuthModal
                    isOpen={showPhoneAuth}
                    onClose={() => setShowPhoneAuth(false)}
                    onSuccess={() => {
                        setShowPhoneAuth(false);
                        window.location.reload();
                    }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <PrevPage title="نظرات من" />
            <div className="px-4 mt-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-3 border-[#E31C5F]/20 border-t-[#E31C5F] rounded-full animate-spin"></div>
                        <div className="text-gray-400 text-sm font-medium">در حال دریافت نظرات...</div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-center text-sm font-medium shadow-sm">
                        {error}
                    </div>
                ) : reviews.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-4">
                        {reviews.filter(review => review && review.id).map(review => (
                            <ReviewCard key={review.id} review={review} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
} 
} 