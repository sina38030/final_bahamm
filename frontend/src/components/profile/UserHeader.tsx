"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heroui/react';
import { FaHeadphones } from "react-icons/fa6";
import EditProfileModal from './EditProfileModal';
import Link from 'next/link';
import CustomModal from '../common/CustomModal';
import { FaComments, FaPhone, FaQuestionCircle } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';
import PhoneAuthModal from '@/components/auth/PhoneAuthModal';

export default function UserHeader() {
    // Use standard useState instead of useDisclosure to avoid type issues
    const [editIsOpen, setEditIsOpen] = useState(false);
    const [linksIsOpen, setLinksIsOpen] = useState(false);
    const [showPhoneAuth, setShowPhoneAuth] = useState(false);
    
    const { user, isAuthenticated, refreshCoins } = useAuth();
    const router = useRouter();

    // Helper function to get the display name
    const getDisplayName = () => {
        if (!user) return '';
        
        if (user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        } else if (user.first_name) {
            return user.first_name;
        } else if (user.last_name) {
            return user.last_name;
        } else if (user.username) {
            return user.username;
        } else {
            return user.phone_number || '';
        }
    };

    // Helper function to get the user identifier (phone or username)
    const getUserIdentifier = () => {
        if (!user) return '';
        
        if (user.phone_number) {
            return user.phone_number;
        } else if (user.username) {
            return `@${user.username}`;
        } else if (user.telegram_id) {
            return `Telegram ID: ${user.telegram_id}`;
        }
        return '';
    };

    return (
        <>
            <div className='bg-white p-4'>
                <div className="relative flex items-center justify-between mb-4">
                    <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-bold">پروفایل</h1>
                    <button onClick={() => router.back()} className="ml-auto p-2 hover:bg-gray-100 rounded-full" aria-label="بازگشت">
                        <span className="inline-block">❮</span>
                    </button>
                </div>
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setEditIsOpen(true)}>
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-xl">👤</span>
                        </div>
                        <div className="ml-2">
                            {isAuthenticated ? (
                                <>
                                    <p className="text-sm font-bold">{getDisplayName()}</p>
                                    <p className="text-xs text-gray-500">{getUserIdentifier()}</p>
                                </>
                            ) : (
                                <button
                                    className="text-blue-600 font-medium"
                                    onClick={(e) => { e.stopPropagation(); setShowPhoneAuth(true); }}
                                >
                                    ورود / ثبت نام
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button 
                            className="bg-transparent p-0 min-w-max flex items-center justify-center"
                            onClick={() => setLinksIsOpen(true)}
                        >
                            <FaHeadphones size={20} />
                        </Button>
                    </div>
                </div>
                
                {isAuthenticated && (
                    <div>
                        <p className="text-xs text-gray-800 font-bold">
                            موجودی کیف پول: {user?.coins?.toLocaleString('fa-IR') || '۰'} تومان
                        </p>
                    </div>
                )}
            </div>
            {isAuthenticated && (
                <script suppressHydrationWarning>
                    {''}
                </script>
            )}
            
            {isAuthenticated && (
                <EditProfileModal 
                    isOpen={editIsOpen}
                    onClose={() => setEditIsOpen(false)}
                    initialData={{
                        first_name: user?.first_name || null,
                        last_name: user?.last_name || null,
                        email: user?.email || '',
                        phone_number: user?.phone_number || '',
                    }}
                />
            )}

            {/* Support Links Modal */}
            <CustomModal
                isOpen={linksIsOpen}
                onClose={() => setLinksIsOpen(false)}
                title="پشتیبانی"
            >
                <div className="space-y-4">
                    <button className="w-full flex items-center gap-3 bg-blue-50 p-3 rounded-lg">
                        <FaComments className="text-blue-600" size={20} />
                        <span className="font-medium">گفتگو با پشتیبانی</span>
                    </button>
                    
                    <button className="w-full flex items-center gap-3 bg-green-50 p-3 rounded-lg">
                        <FaPhone className="text-green-600" size={20} />
                        <span className="font-medium">تماس با پشتیبانی</span>
                    </button>
                    
                    <button className="w-full flex items-center gap-3 bg-yellow-50 p-3 rounded-lg">
                        <FaQuestionCircle className="text-yellow-600" size={20} />
                        <span className="font-medium">سوالات متداول</span>
                    </button>
                </div>
            </CustomModal>

            {/* Bottom-sheet phone authentication for unauthenticated users */}
            <PhoneAuthModal
                isOpen={showPhoneAuth}
                onClose={() => setShowPhoneAuth(false)}
                onSuccess={() => {
                    setShowPhoneAuth(false);
                    // After successful login, UI will re-render due to auth state change
                    // Optionally, force a refresh if needed: router.refresh();
                }}
            />
        </>
    );
}