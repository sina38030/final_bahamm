'use client';

import React, { useState, useEffect } from 'react';
import { FaStar, FaEdit, FaTrash, FaShoppingCart } from 'react-icons/fa';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import PrevPage from '@/components/common/PrevPage';
import CustomModal from '@/components/common/CustomModal';
import apiClient from '@/utils/apiClient';

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
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingReview, setEditingReview] = useState<Review | null>(null);
    const [editedComment, setEditedComment] = useState('');

    // Fetch reviews on mount
    useEffect(() => {
        fetchReviews();
        
        // Listen for review submission events
        const handleReviewSubmitted = () => {
            fetchReviews();
        };
        
        window.addEventListener('order-review-submitted', handleReviewSubmitted);
        
        return () => {
            window.removeEventListener('order-review-submitted', handleReviewSubmitted);
        };
    }, []);

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
        // Navigate to the review page for the order
        if (review.order) {
            router.push(`/order/${review.order.id}/review`);
        }
    };

    const handleSaveEdit = () => {
        if (editingReview) {
            setReviews(reviews.map(review => 
                review.id === editingReview.id 
                    ? { ...review, comment: editedComment }
                    : review
            ));
            setIsEditModalOpen(false);
            setEditingReview(null);
        }
    };

    const EmptyState = () => (
        <div className="flex flex-col items-center justify-center py-12">
            <div className="w-48 h-48 relative mb-6">
                <Image
                    src="/images/basket.png"
                    alt="بدون نظر"
                    fill
                    className="object-contain"
                    priority
                />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
                هنوز نظری ثبت نکرده‌اید
            </h3>
            <p className="text-gray-500 text-center">
                نظرات شما به بهبود تجربه خرید سایر کاربران کمک می‌کند
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

        return (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                {/* Review Header with Product Info */}
                <div className="flex items-start gap-4 mb-4">
                    {/* تصویر محصول */}
                    <div className="w-20 h-20 relative rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
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
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <FaStar size={24} />
                                </div>
                            );
                        })()}
                    </div>

                    {/* اطلاعات نظر */}
                    <div className="flex-grow">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 mb-1">
                                    {review.product_name}
                                </h3>
                                <StarRating rating={review.rating} />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(review)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="ویرایش نظر"
                                >
                                    <FaEdit size={18} />
                                </button>
                            </div>
                        </div>
                        {review.comment && (
                            <p className="text-gray-600 mt-2 text-sm">{review.comment}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-gray-400 text-xs">
                                {formatDate(review.created_at)}
                            </span>
                            {review.approved === false && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded text-xs border border-yellow-200">
                                    در انتظار تایید
                                </span>
                            )}
                            {review.approved === true && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs border border-green-200">
                                    تایید شده
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Order Items Basket */}
                {review.order && Array.isArray(review.order.items) && review.order.items.length > 0 && (
                    <div className="border-t border-gray-200 pt-3">
                        <div className="flex items-center gap-2 mb-2">
                            <FaShoppingCart className="text-gray-500" size={14} />
                            <span className="text-sm font-medium text-gray-700">
                                سبد محصولات این سفارش
                            </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {review.order.items.filter(item => item && item.name).map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                                    <div className="w-12 h-12 relative rounded overflow-hidden flex-shrink-0 bg-white">
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
                                                            sizes="48px"
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
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <p className="text-xs text-gray-800 truncate" title={item.name}>
                                            {item.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            تعداد: {item.quantity}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen mx-auto pb-16">
            <PrevPage title="نظرات من" />
            <div className="p-4">
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="text-gray-500">در حال بارگذاری...</div>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-center">
                        {error}
                    </div>
                ) : reviews.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div>
                        {reviews.filter(review => review && review.id).map(review => (
                            <ReviewCard key={review.id} review={review} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
} 