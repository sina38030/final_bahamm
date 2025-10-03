'use client';

import React, { useState } from 'react';
import { FaStar, FaEdit, FaTrash } from 'react-icons/fa';
import Image from 'next/image';
import { StaticImageData } from 'next/image';
import PrevPage from '@/components/common/PrevPage';
import CustomModal from '@/components/common/CustomModal';

type Review = {
    id: number;
    productId: number;
    productName: string;
    productImage: string;
    rating: number;
    comment: string;
    date: string;
};

export default function CommentsPage() {
    const [reviews, setReviews] = useState<Review[]>([
        {
            id: 1,
            productId: 101,
            productName: "هدفون بی سیم سامسونگ",
            productImage: "/images/product1.webp",
            rating: 4,
            comment: "کیفیت صدا عالی، باتری مناسب. راضی هستم از خرید.",
            date: "۱۴۰۲/۱۲/۱۵"
        },
        {
            id: 2,
            productId: 102,
            productName: "ساعت هوشمند اپل",
            productImage: "/images/product2.webp",
            rating: 5,
            comment: "بهترین ساعت هوشمندی که تا حالا داشتم. کیفیت ساخت عالی.",
            date: "۱۴۰۲/۱۲/۱۰"
        }
    ]);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingReview, setEditingReview] = useState<Review | null>(null);
    const [editedComment, setEditedComment] = useState('');

    const handleDelete = (reviewId: number) => {
        if (window.confirm('آیا از حذف این نظر مطمئن هستید؟')) {
            setReviews(reviews.filter(review => review.id !== reviewId));
        }
    };

    const handleEdit = (review: Review) => {
        setEditingReview(review);
        setEditedComment(review.comment);
        setIsEditModalOpen(true);
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

    const ReviewCard = ({ review }: { review: Review }) => (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
            <div className="flex items-start gap-4">
                {/* تصویر محصول */}
                <div className="w-20 h-20 relative rounded-lg overflow-hidden flex-shrink-0">
                    {review.productImage && (
                        <Image
                            src={review.productImage }
                            alt={review.productName}
                            fill
                            className="object-cover"
                            sizes="80px"
                        />
                    )}
                </div>

                {/* اطلاعات نظر */}
                <div className="flex-grow">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="font-medium text-gray-900 mb-1">
                                {review.productName}
                            </h3>
                            <StarRating rating={review.rating} />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleEdit(review)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            >
                                <FaEdit size={18} />
                            </button>
                            <button
                                onClick={() => handleDelete(review.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            >
                                <FaTrash size={18} />
                            </button>
                        </div>
                    </div>
                    <p className="text-gray-600 mt-2">{review.comment}</p>
                    <span className="text-gray-400 text-sm mt-2 block">
                        {review.date}
                    </span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen mx-auto pb-16">
            <PrevPage title="نظرات من" />
            <div className="p-4">
                {reviews.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div>
                        {reviews.map(review => (
                            <ReviewCard key={review.id} review={review} />
                        ))}
                    </div>
                )}
            </div>

            <CustomModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingReview(null);
                }}
                title="ویرایش نظر"
                submitLabel="ذخیره تغییرات"
                onSubmit={handleSaveEdit}
            >
                {editingReview && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 relative rounded-lg overflow-hidden flex-shrink-0">
                                {editingReview.productImage && (
                                    <Image
                                        src={editingReview.productImage}
                                        alt={editingReview.productName}
                                        fill
                                        className="object-cover"
                                        sizes="64px"
                                    />
                                )}
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900">
                                    {editingReview.productName}
                                </h3>
                                <StarRating rating={editingReview.rating} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                نظر شما
                            </label>
                            <textarea
                                value={editedComment}
                                onChange={(e) => setEditedComment(e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                rows={4}
                                placeholder="نظر خود را بنویسید..."
                            />
                        </div>
                    </div>
                )}
            </CustomModal>
            
            
        </div>
    );
} 