"use client";

import React from 'react';
import CustomModal from '../common/CustomModal';

interface Comment {
    id: number;
    user: string;
    text: string;
}

interface CommentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    comments: Comment[];
}

const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, onClose, comments }) => {
    return (
        <CustomModal
            isOpen={isOpen}
            onClose={onClose}
            cancelLabel='بستن'
            title="نظرات کاربران"
        >
            <div className="mt-6 space-y-4">
                {comments.length === 0 ? (
                    <p className="text-center">هیچ نظری وجود ندارد.</p>
                ) : (
                    comments.map(comment => (
                        <div
                            key={comment.id}
                            className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden">
                                        <img
                                            src="/default-avatar.png"
                                            alt={`${comment.user}'s avatar`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <p className="font-medium text-xs text-gray-800">
                                            {comment.user}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1">
                                            {[...Array(5)].map((_, index) => (
                                                <svg
                                                    key={index}
                                                    className={`w-4 h-4 ${index < 4 ? "text-yellow-400" : "text-gray-300"}`}
                                                    fill="currentColor"
                                                    viewBox="0 0 20 20"
                                                >
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {new Date().toLocaleDateString("fa-IR")}
                                </span>
                            </div>
                            <p className="text-gray-600 leading-relaxed">{comment.text}</p>
                        </div>
                    ))
                )}
            </div>
        </CustomModal>
    );
};

export default CommentsModal;